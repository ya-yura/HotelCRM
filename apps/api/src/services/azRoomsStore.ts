import type { AzRoom, AzRoomCreate, AzRoomUpdate } from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData, updateHotelData } from "./dataStore";

export async function listAzRooms(propertyId: string) {
  return (await getHotelData()).azRooms
    .filter((room) => room.propertyId === propertyId)
    .sort((left, right) => left.number.localeCompare(right.number, "ru"));
}

export async function getAzRoom(propertyId: string, roomId: string) {
  return (
    (await getHotelData()).azRooms.find((room) => room.propertyId === propertyId && room.id === roomId) ??
    null
  );
}

export async function createAzRoom(propertyId: string, input: AzRoomCreate) {
  return updateHotelData(async (data) => {
    const existing = data.azRooms.find(
      (room) => room.propertyId === propertyId && room.number === input.number
    );
    if (existing) {
      return null;
    }

    const room: AzRoom & { propertyId: string } = {
      propertyId,
      id: `az_room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...input
    };
    data.azRooms.unshift(room);
    return room;
  });
}

export async function updateAzRoom(propertyId: string, roomId: string, patch: AzRoomUpdate) {
  return updateHotelData(async (data) => {
    const index = data.azRooms.findIndex(
      (room) => room.propertyId === propertyId && room.id === roomId
    );
    if (index === -1) {
      return null;
    }

    const nextNumber = patch.number ?? data.azRooms[index].number;
    const conflicting = data.azRooms.find(
      (room) =>
        room.propertyId === propertyId &&
        room.id !== roomId &&
        room.number === nextNumber
    );
    if (conflicting) {
      return false;
    }

    data.azRooms[index] = {
      ...data.azRooms[index],
      ...patch
    };
    return data.azRooms[index];
  });
}

export async function deleteAzRoom(propertyId: string, roomId: string) {
  return updateHotelData(async (data) => {
    const bookingLinked = data.azBookings.some(
      (booking) => booking.propertyId === propertyId && booking.roomId === roomId
    );
    if (bookingLinked) {
      return false;
    }

    const index = data.azRooms.findIndex(
      (room) => room.propertyId === propertyId && room.id === roomId
    );
    if (index === -1) {
      return null;
    }

    data.azRooms.splice(index, 1);
    return true;
  });
}
