import type {
  ReservationCreate,
  ReservationSummary,
  ReservationUpdate
} from "@hotel-crm/shared/reservations";
import type { GuestUpsert } from "@hotel-crm/shared/guests";
import type { PropertyScoped } from "./dataStore";
import { getHotelData, updateHotelData } from "./dataStore";
import { attachReservationToGuest, createOrMatchGuest } from "./guestStore";

function nowIso() {
  return new Date().toISOString();
}

function buildReservation(input: ReservationCreate, guestId?: string): ReservationSummary {
  const createdAt = nowIso();
  const depositRequired = input.depositRequired ?? 0;
  const depositAmount = input.depositAmount ?? 0;
  return {
    id: `resv_${input.idempotencyKey}`,
    guestId,
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    guestEmail: input.guestEmail,
    roomLabel: "UNASSIGNED",
    roomTypeId: input.roomTypeId,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    status: input.source === "walk_in" ? "confirmed" : "draft",
    source: input.source,
    adultCount: input.adultCount,
    childCount: input.childCount,
    totalAmount: input.totalAmount,
    paidAmount: 0,
    balanceDue: input.totalAmount,
    depositRequired,
    depositAmount,
    notes: input.notes,
    createdAt,
    updatedAt: createdAt,
    earlyCheckInGranted: false,
    lateCheckoutGranted: false,
    splitFromReservationId: null,
    mergedReservationIds: [],
    paymentLinkSentAt: null
  };
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

export async function listReservations(propertyId: string) {
  return (await getHotelData()).reservations
    .filter((reservation) => reservation.propertyId === propertyId)
    .sort((left, right) => right.checkInDate.localeCompare(left.checkInDate));
}

export async function getReservation(propertyId: string, id: string) {
  return (
    (await getHotelData()).reservations.find(
      (reservation) => reservation.propertyId === propertyId && reservation.id === id
    ) ?? null
  );
}

export async function findReservationRoomConflict(
  propertyId: string,
  reservationId: string,
  roomLabel: string,
  checkInDate: string,
  checkOutDate: string
) {
  return (
    (await getHotelData()).reservations.find(
      (reservation) =>
        reservation.propertyId === propertyId &&
        reservation.id !== reservationId &&
        reservation.roomLabel === roomLabel &&
        !["cancelled", "checked_out", "no_show"].includes(reservation.status) &&
        overlaps(checkInDate, checkOutDate, reservation.checkInDate, reservation.checkOutDate)
    ) ?? null
  );
}

export async function createReservation(propertyId: string, input: ReservationCreate) {
  const guestPayload: GuestUpsert = {
    fullName: input.guestName,
    phone: input.guestPhone ?? "",
    email: input.guestEmail ?? "",
    birthDate: input.guestBirthDate ?? "",
    notes: input.notes ?? "",
    preferences: []
  };
  const guest = await createOrMatchGuest(propertyId, guestPayload);

  return updateHotelData(async (data) => {
    const id = `resv_${input.idempotencyKey}`;
    const existing = data.reservations.find(
      (reservation) => reservation.propertyId === propertyId && reservation.id === id
    );
    if (existing) {
      return existing;
    }

    const reservation: PropertyScoped<ReservationSummary> = {
      propertyId,
      ...buildReservation(input, guest.id)
    };

    data.reservations.unshift(reservation);
    const hasFolio = data.folios.some(
      (folio) => folio.propertyId === propertyId && folio.reservationId === reservation.id
    );
    if (!hasFolio) {
      data.folios.unshift({
        propertyId,
        reservationId: reservation.id,
        guestName: input.guestName,
        totalAmount: input.totalAmount,
        paidAmount: 0,
        balanceDue: input.totalAmount,
        status: input.totalAmount > 0 ? "unpaid" : "paid",
        pendingFiscalReceipts: 0,
        charges: [],
        payments: [],
        lines: [],
        paymentLinks: []
      });
    }

    return reservation;
  }).then(async (reservation) => {
    await attachReservationToGuest(propertyId, guest.id, reservation.id);
    return reservation;
  });
}

export async function updateReservation(propertyId: string, id: string, patch: ReservationUpdate) {
  return updateHotelData(async (data) => {
    const index = data.reservations.findIndex(
      (reservation) => reservation.propertyId === propertyId && reservation.id === id
    );
    if (index === -1) {
      return null;
    }

    const current = data.reservations[index];
    const updated = {
      ...current,
      ...patch,
      mergedReservationIds: patch.mergedReservationIds ?? current.mergedReservationIds,
      updatedAt: nowIso()
    };

    data.reservations[index] = updated;

    if (updated.guestId && (patch.guestName || patch.guestPhone || patch.guestEmail)) {
      const guestIndex = data.guests.findIndex(
        (guest) => guest.propertyId === propertyId && guest.id === updated.guestId
      );
      if (guestIndex >= 0) {
        data.guests[guestIndex] = {
          ...data.guests[guestIndex],
          fullName: patch.guestName ?? current.guestName,
          phone: patch.guestPhone ?? current.guestPhone ?? "",
          email: patch.guestEmail ?? current.guestEmail ?? ""
        };
      }
    }

    const folioIndex = data.folios.findIndex(
      (folio) => folio.propertyId === propertyId && folio.reservationId === id
    );
    if (folioIndex >= 0 && (patch.guestName || patch.totalAmount !== undefined)) {
      const currentFolio = data.folios[folioIndex];
      const totalAmount = patch.totalAmount ?? currentFolio.totalAmount;
      const paidAmount = currentFolio.paidAmount;
      data.folios[folioIndex] = {
        ...currentFolio,
        guestName: patch.guestName ?? currentFolio.guestName,
        totalAmount,
        balanceDue: Math.max(totalAmount - paidAmount, 0),
        status:
          paidAmount <= 0 ? "unpaid" : paidAmount >= totalAmount ? "paid" : "partially_paid"
      };
    }

    return updated as ReservationSummary;
  });
}
