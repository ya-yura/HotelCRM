import type {
  AzDirectAvailabilityRequest,
  AzDirectAvailabilityResponse,
  AzDirectBookingConfirmation,
  AzDirectProvisionalReservationRequest,
  AzDirectQuote,
  AzDirectQuoteRequest
} from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData, updateHotelData } from "./dataStore";
import { createPaymentLink } from "./paymentStore";
import { createReservation, getReservation, updateReservation } from "./reservationStore";

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "_");
}

function nightsBetween(checkInDate: string, checkOutDate: string) {
  const start = new Date(`${checkInDate}T00:00:00Z`);
  const end = new Date(`${checkOutDate}T00:00:00Z`);
  return Math.max(Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)), 1);
}

function overlaps(left: { checkInDate: string; checkOutDate: string }, right: { checkInDate: string; checkOutDate: string }) {
  return left.checkInDate < right.checkOutDate && right.checkInDate < left.checkOutDate;
}

function isBlockingReservationStatus(status: string) {
  return !["cancelled", "checked_out", "no_show"].includes(status);
}

function roomMatchesRoomType(roomType: string, roomTypeId: string) {
  return normalizeKey(roomType) === normalizeKey(roomTypeId);
}

function getBaseRate(
  data: Awaited<ReturnType<typeof getHotelData>>,
  propertyId: string,
  roomTypeId: string
) {
  const directRate = data.azRatePlanMappings.find(
    (mapping) => mapping.propertyId === propertyId && normalizeKey(mapping.roomTypeId) === normalizeKey(roomTypeId)
  );

  if (directRate?.baseRate) {
    return directRate.baseRate;
  }

  return 3500;
}

function listAvailabilityOptions(
  data: Awaited<ReturnType<typeof getHotelData>>,
  propertyId: string,
  input: AzDirectAvailabilityRequest
) {
  const roomGroups = new Map<string, { roomTypeId: string; roomTypeLabel: string; totalUnits: number }>();

  data.rooms
    .filter((room) => room.propertyId === propertyId && !["blocked_maintenance", "out_of_service"].includes(room.status))
    .forEach((room) => {
      const roomTypeId = normalizeKey(room.roomType);
      if (input.roomTypeId && roomTypeId !== normalizeKey(input.roomTypeId)) {
        return;
      }

      const current = roomGroups.get(roomTypeId);
      if (current) {
        current.totalUnits += 1;
      } else {
        roomGroups.set(roomTypeId, {
          roomTypeId,
          roomTypeLabel: room.roomType,
          totalUnits: 1
        });
      }
    });

  const nights = nightsBetween(input.checkInDate, input.checkOutDate);

  return [...roomGroups.values()].map((group) => {
    const occupiedUnits = data.reservations.filter(
      (reservation) =>
        reservation.propertyId === propertyId &&
        normalizeKey(reservation.roomTypeId ?? "") === group.roomTypeId &&
        isBlockingReservationStatus(reservation.status) &&
        overlaps(
          { checkInDate: reservation.checkInDate, checkOutDate: reservation.checkOutDate },
          { checkInDate: input.checkInDate, checkOutDate: input.checkOutDate }
        )
    ).length;

    const nightlyRate = getBaseRate(data, propertyId, group.roomTypeId);
    const totalAmount = nightlyRate * nights;

    return {
      roomTypeId: group.roomTypeId,
      roomTypeLabel: group.roomTypeLabel,
      availableUnits: Math.max(group.totalUnits - occupiedUnits, 0),
      nightlyRate,
      totalAmount,
      depositAmount: Math.min(totalAmount, Math.max(Math.round(totalAmount * 0.3), 1500))
    };
  }).filter((option) => option.availableUnits > 0);
}

export async function requestDirectAvailability(propertyId: string, input: AzDirectAvailabilityRequest): Promise<AzDirectAvailabilityResponse> {
  const data = await getHotelData();
  return {
    propertyId,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    nights: nightsBetween(input.checkInDate, input.checkOutDate),
    options: listAvailabilityOptions(data, propertyId, input)
  };
}

export async function createDirectQuote(propertyId: string, input: AzDirectQuoteRequest): Promise<AzDirectQuote | null> {
  const data = await getHotelData();
  const option = listAvailabilityOptions(data, propertyId, input).find(
    (entry) => entry.roomTypeId === normalizeKey(input.roomTypeId)
  );

  if (!option) {
    return null;
  }

  const quote: AzDirectQuote = {
    id: `quote_${Date.now()}`,
    propertyId,
    roomTypeId: option.roomTypeId,
    roomTypeLabel: option.roomTypeLabel,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    nights: nightsBetween(input.checkInDate, input.checkOutDate),
    nightlyRate: option.nightlyRate,
    totalAmount: option.totalAmount,
    depositAmount: option.depositAmount,
    promoCode: input.promoCode,
    cancellationPolicy:
      data.azRatePlanMappings.find(
        (mapping) => mapping.propertyId === propertyId && normalizeKey(mapping.roomTypeId) === option.roomTypeId
      )?.cancellationPolicy ?? "Flexible",
    paymentDeadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    availableUnits: option.availableUnits
  };

  await updateHotelData(async (nextData) => {
    nextData.azDirectQuotes.unshift({
      ...quote,
      propertyId
    });
  });

  return quote;
}

export async function createDirectProvisionalReservation(
  propertyId: string,
  input: AzDirectProvisionalReservationRequest
): Promise<AzDirectBookingConfirmation | null> {
  const data = await getHotelData();
  const quote = data.azDirectQuotes.find(
    (entry) => entry.propertyId === propertyId && entry.id === input.quoteId
  );

  if (!quote || new Date(quote.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const availability = listAvailabilityOptions(data, propertyId, {
    checkInDate: quote.checkInDate,
    checkOutDate: quote.checkOutDate,
    adults: 1,
    children: 0,
    roomTypeId: quote.roomTypeId,
    promoCode: quote.promoCode
  }).find((entry) => entry.roomTypeId === quote.roomTypeId);

  if (!availability || availability.availableUnits <= 0) {
    return null;
  }

  const reservation = await createReservation(propertyId, {
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    guestEmail: input.guestEmail,
    checkInDate: quote.checkInDate,
    checkOutDate: quote.checkOutDate,
    adultCount: 1,
    childCount: 0,
    roomTypeId: quote.roomTypeId,
    totalAmount: quote.totalAmount,
    depositRequired: quote.depositAmount,
    depositAmount: 0,
    notes: input.notes,
    source: "direct",
    sourceAttribution: {
      channel: "direct_site",
      externalBookingId: quote.id,
      externalRoomTypeId: quote.roomTypeId,
      externalRatePlanId: "direct_site",
      partnerName: "",
      campaignCode: quote.promoCode,
      commissionRate: 0
    },
    idempotencyKey: `direct_${quote.id}_${Date.now()}`
  });

  const paymentLink = quote.depositAmount > 0
    ? await createPaymentLink(propertyId, {
        reservationId: reservation.id,
        guestName: reservation.guestName,
        amount: quote.depositAmount,
        method: "sbp",
        note: "Direct booking deposit",
        correlationId: `direct_payment_${reservation.id}`
      })
    : null;

  return {
    reservationId: reservation.id,
    status: "pending_confirmation",
    totalAmount: quote.totalAmount,
    balanceDue: quote.totalAmount,
    paymentLinkId: paymentLink?.paymentLink.id ?? null,
    paymentLinkUrl: paymentLink?.paymentLink.url ?? null,
    expiresAt: quote.expiresAt,
    source: "direct"
  };
}

export async function confirmDirectReservation(propertyId: string, reservationId: string): Promise<AzDirectBookingConfirmation | null> {
  const reservation = await getReservation(propertyId, reservationId);
  if (!reservation) {
    return null;
  }

  const updated = await updateReservation(propertyId, reservationId, { status: "confirmed" });
  if (!updated) {
    return null;
  }

  const data = await getHotelData();
  const folio = data.folios.find((entry) => entry.propertyId === propertyId && entry.reservationId === reservationId);
  const paymentLink = folio?.paymentLinks[0] ?? null;

  return {
    reservationId: updated.id,
    status: "confirmed",
    totalAmount: updated.totalAmount ?? 0,
    balanceDue: updated.balanceDue,
    paymentLinkId: paymentLink?.id ?? null,
    paymentLinkUrl: paymentLink?.url ?? null,
    expiresAt: paymentLink?.expiresAt ?? null,
    source: "direct"
  };
}
