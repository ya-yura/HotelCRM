import type {
  GuestDuplicateCandidate,
  GuestProfile,
  GuestUpsert
} from "@hotel-crm/shared/guests";
import { getHotelData, updateHotelData } from "./dataStore";

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeDocumentKey(guest: Pick<GuestProfile, "document">) {
  if (!guest.document) {
    return "";
  }

  return [
    guest.document.type,
    guest.document.series.replace(/\s+/g, ""),
    guest.document.number.replace(/\s+/g, "")
  ]
    .filter(Boolean)
    .join(":")
    .toLowerCase();
}

function matchReasons(left: GuestProfile, right: GuestProfile) {
  const reasons: string[] = [];
  if (left.id === right.id || right.mergedIntoGuestId) {
    return reasons;
  }

  const leftPhone = normalizePhone(left.phone);
  const rightPhone = normalizePhone(right.phone);
  if (leftPhone && rightPhone && leftPhone === rightPhone) {
    reasons.push("совпадает телефон");
  }

  const leftName = normalizeName(left.fullName);
  const rightName = normalizeName(right.fullName);
  if (leftName && rightName && leftName === rightName) {
    reasons.push("совпадает ФИО");
  }

  const leftDocument = normalizeDocumentKey(left);
  const rightDocument = normalizeDocumentKey(right);
  if (leftDocument && rightDocument && leftDocument === rightDocument) {
    reasons.push("совпадает документ");
  }

  return reasons;
}

function mergeGuestRecords<T extends GuestProfile>(primary: T, duplicate: GuestProfile) {
  return {
    ...primary,
    gender: primary.gender !== "unspecified" ? primary.gender : duplicate.gender,
    phone: primary.phone || duplicate.phone,
    email: primary.email || duplicate.email,
    birthDate: primary.birthDate || duplicate.birthDate,
    citizenship: primary.citizenship || duplicate.citizenship,
    residentialAddress: primary.residentialAddress || duplicate.residentialAddress,
    arrivalPurpose: primary.arrivalPurpose || duplicate.arrivalPurpose,
    notes: [primary.notes, duplicate.notes].filter(Boolean).join("\n").trim(),
    preferences: Array.from(new Set([...primary.preferences, ...duplicate.preferences])),
    document: primary.document ?? duplicate.document,
    visa: primary.visa ?? duplicate.visa,
    migrationCard: primary.migrationCard ?? duplicate.migrationCard,
    stayHistory: Array.from(new Set([...primary.stayHistory, ...duplicate.stayHistory])),
    mergedGuestIds: Array.from(
      new Set([
        ...primary.mergedGuestIds,
        duplicate.id,
        ...duplicate.mergedGuestIds
      ])
    )
  } as T;
}

export async function listGuests(propertyId: string) {
  return (await getHotelData()).guests.filter(
    (guest) => guest.propertyId === propertyId && !guest.mergedIntoGuestId
  );
}

export async function getGuest(propertyId: string, guestId: string) {
  return (
    (await getHotelData()).guests.find(
      (guest) => guest.propertyId === propertyId && guest.id === guestId
    ) ?? null
  );
}

export async function findGuestDuplicates(propertyId: string, guestId: string) {
  const data = await getHotelData();
  const guest = data.guests.find(
    (item) => item.propertyId === propertyId && item.id === guestId
  );
  if (!guest) {
    return [] as GuestDuplicateCandidate[];
  }

  return data.guests
    .filter((item) => item.propertyId === propertyId)
    .map((item) => ({ guest: item, reasons: matchReasons(guest, item) }))
    .filter((item) => item.reasons.length > 0);
}

export async function createOrMatchGuest(propertyId: string, input: GuestUpsert) {
  return updateHotelData(async (data) => {
    const candidate: GuestProfile = {
      id: "",
      fullName: input.fullName,
      gender: input.gender ?? "unspecified",
      phone: input.phone ?? "",
      email: input.email ?? "",
      birthDate: input.birthDate ?? "",
      citizenship: input.citizenship ?? "RU",
      residentialAddress: input.residentialAddress ?? "",
      arrivalPurpose: input.arrivalPurpose ?? "tourism",
      notes: input.notes ?? "",
      preferences: input.preferences ?? [],
      document: input.document,
      visa: input.visa,
      migrationCard: input.migrationCard,
      stayHistory: [],
      mergedGuestIds: [],
      mergedIntoGuestId: null
    };

    const existing = data.guests
      .filter((guest) => guest.propertyId === propertyId)
      .find((guest) => matchReasons(candidate, guest).length > 0);
    if (existing) {
      return existing;
    }

    const created: GuestProfile & { propertyId: string } = {
      ...candidate,
      id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      propertyId
    };
    data.guests.unshift(created);
    return created;
  });
}

export async function updateGuest(propertyId: string, guestId: string, patch: Partial<GuestUpsert>) {
  return updateHotelData(async (data) => {
    const index = data.guests.findIndex(
      (guest) => guest.propertyId === propertyId && guest.id === guestId
    );
    if (index === -1) {
      return null;
    }

    const current = data.guests[index];
    const updated = {
      ...current,
      ...patch,
      preferences: patch.preferences ?? current.preferences,
      document: patch.document ?? current.document,
      visa: patch.visa ?? current.visa,
      migrationCard: patch.migrationCard ?? current.migrationCard
    };
    data.guests[index] = updated;
    return updated as GuestProfile;
  });
}

export async function attachReservationToGuest(propertyId: string, guestId: string, reservationId: string) {
  return updateHotelData(async (data) => {
    const index = data.guests.findIndex(
      (guest) => guest.propertyId === propertyId && guest.id === guestId
    );
    if (index === -1) {
      return null;
    }

    const current = data.guests[index];
    if (current.stayHistory.includes(reservationId)) {
      return current as GuestProfile;
    }

    const updated = {
      ...current,
      stayHistory: [reservationId, ...current.stayHistory]
    };
    data.guests[index] = updated;
    return updated as GuestProfile;
  });
}

export async function mergeGuests(propertyId: string, primaryGuestId: string, duplicateGuestId: string) {
  return updateHotelData(async (data) => {
    const primaryIndex = data.guests.findIndex(
      (guest) => guest.propertyId === propertyId && guest.id === primaryGuestId
    );
    const duplicateIndex = data.guests.findIndex(
      (guest) => guest.propertyId === propertyId && guest.id === duplicateGuestId
    );

    if (primaryIndex === -1 || duplicateIndex === -1 || primaryGuestId === duplicateGuestId) {
      return null;
    }

    const primary = data.guests[primaryIndex];
    const duplicate = data.guests[duplicateIndex];
    const updatedPrimary = mergeGuestRecords(primary, duplicate);
    data.guests[primaryIndex] = updatedPrimary;
    data.guests[duplicateIndex] = {
      ...duplicate,
      mergedIntoGuestId: primaryGuestId
    };

    const updatedReservationIds: string[] = [];
    data.reservations = data.reservations.map((reservation) => {
      if (reservation.propertyId !== propertyId || reservation.guestId !== duplicateGuestId) {
        return reservation;
      }

      updatedReservationIds.push(reservation.id);
      return {
        ...reservation,
        guestId: primaryGuestId,
        guestName: updatedPrimary.fullName,
        guestPhone: updatedPrimary.phone,
        guestEmail: updatedPrimary.email
      };
    });

    return {
      primaryGuest: updatedPrimary,
      mergedGuestId: duplicateGuestId,
      updatedReservationIds
    };
  });
}
