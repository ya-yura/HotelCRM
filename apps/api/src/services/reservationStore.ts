import type { ReservationCreate, ReservationSummary } from "@hotel-crm/shared/reservations";
import type { PropertyScoped } from "./dataStore";
import { getHotelData, updateHotelData } from "./dataStore";

export async function listReservations(propertyId: string) {
  return (await getHotelData()).reservations.filter((reservation) => reservation.propertyId === propertyId);
}

export async function getReservation(propertyId: string, id: string) {
  return (
    (await getHotelData()).reservations.find(
      (reservation) => reservation.propertyId === propertyId && reservation.id === id
    ) ?? null
  );
}

export async function createReservation(propertyId: string, input: ReservationCreate) {
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
      id,
      guestName: input.guestName,
      roomLabel: "UNASSIGNED",
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      status: "draft",
      balanceDue: input.totalAmount
    };

    data.reservations.unshift(reservation);
    return reservation;
  });
}

export async function updateReservation(propertyId: string, id: string, patch: Partial<ReservationSummary>) {
  return updateHotelData(async (data) => {
    const index = data.reservations.findIndex(
      (reservation) => reservation.propertyId === propertyId && reservation.id === id
    );
    if (index === -1) {
      return null;
    }

    const updated = {
      ...data.reservations[index],
      ...patch
    };

    data.reservations[index] = updated;
    return updated as ReservationSummary;
  });
}
