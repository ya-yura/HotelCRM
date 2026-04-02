import type { StayRecord } from "@hotel-crm/shared/stays";
import { getHotelData, updateHotelData } from "./dataStore";

export async function listStays(propertyId: string) {
  return (await getHotelData()).stays.filter((stay) => stay.propertyId === propertyId);
}

export async function getActiveStayByReservation(propertyId: string, reservationId: string) {
  return (
    (await getHotelData()).stays.find(
      (stay) => stay.propertyId === propertyId && stay.reservationId === reservationId && stay.status === "active"
    ) ?? null
  );
}

export async function createStay(
  propertyId: string,
  input: Omit<StayRecord, "id" | "checkedOutAt" | "status" | "checkedInAt">
) {
  return updateHotelData(async (data) => {
    const existing = data.stays.find(
      (stay) => stay.propertyId === propertyId && stay.reservationId === input.reservationId && stay.status === "active"
    );
    if (existing) {
      return existing as StayRecord;
    }

    const stay = {
      propertyId,
      id: `stay_${Date.now()}`,
      reservationId: input.reservationId,
      roomId: input.roomId,
      roomLabel: input.roomLabel,
      guestName: input.guestName,
      status: "active" as const,
      checkedInAt: new Date().toISOString(),
      checkedOutAt: null
    };
    data.stays.unshift(stay);
    return stay as StayRecord;
  });
}

export async function closeStay(propertyId: string, reservationId: string) {
  return updateHotelData(async (data) => {
    const index = data.stays.findIndex(
      (stay) => stay.propertyId === propertyId && stay.reservationId === reservationId && stay.status === "active"
    );
    if (index === -1) {
      return null;
    }

    const updated = {
      ...data.stays[index],
      status: "checked_out" as const,
      checkedOutAt: new Date().toISOString()
    };
    data.stays[index] = updated;
    return updated as StayRecord;
  });
}
