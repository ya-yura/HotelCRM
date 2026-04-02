import type { RoomCreate, RoomStatus, RoomSummary } from "@hotel-crm/shared/rooms";
import { getHotelData, updateHotelData } from "./dataStore";

function describeStatus(status: RoomStatus) {
  switch (status) {
    case "available":
      return { housekeepingNote: "Ready for check-in", nextAction: "Can be assigned immediately" };
    case "dirty":
      return { housekeepingNote: "Requires cleaning", nextAction: "Send to housekeeping queue" };
    case "cleaning":
      return { housekeepingNote: "Cleaning in progress", nextAction: "Wait for completion and inspection" };
    case "inspected":
      return { housekeepingNote: "Cleaned and awaiting release", nextAction: "Approve room to available" };
    case "occupied":
      return { housekeepingNote: "Guest currently in room", nextAction: "Hold until checkout" };
    case "reserved":
      return { housekeepingNote: "Reserved for upcoming guest", nextAction: "Protect from reassignment" };
    case "blocked_maintenance":
      return { housekeepingNote: "Maintenance block active", nextAction: "Keep out of sale" };
    case "out_of_service":
      return { housekeepingNote: "Out of service", nextAction: "Needs manual return-to-service" };
  }
}

export async function listRooms(propertyId: string) {
  return (await getHotelData()).rooms
    .filter((room) => room.propertyId === propertyId)
    .sort((left, right) => left.number.localeCompare(right.number));
}

export async function getRoom(propertyId: string, id: string) {
  return (await getHotelData()).rooms.find((room) => room.propertyId === propertyId && room.id === id) ?? null;
}

export async function updateRoomStatus(propertyId: string, id: string, status: RoomStatus) {
  return updateHotelData(async (data) => {
    const index = data.rooms.findIndex((room) => room.propertyId === propertyId && room.id === id);
    if (index === -1) {
      return null;
    }

    const room = data.rooms[index];
    const description = describeStatus(status);
    const updated = {
      ...room,
      status,
      housekeepingNote: description.housekeepingNote,
      nextAction: description.nextAction,
      priority: status === "blocked_maintenance" ? "blocked" : room.priority
    };
    data.rooms[index] = updated;
    return updated as RoomSummary;
  });
}

export async function createRoom(propertyId: string, input: RoomCreate) {
  return updateHotelData(async (data) => {
    const existing = data.rooms.find(
      (room) => room.propertyId === propertyId && room.number === input.number
    );
    if (existing) {
      return null;
    }

    const room: typeof data.rooms[number] = {
      propertyId,
      id: `room_${input.number.toLowerCase()}`,
      number: input.number,
      roomType: input.roomType,
      status: "available",
      housekeepingNote: "Ready for check-in",
      nextAction: "Can be assigned immediately",
      occupancyLabel: "Free tonight",
      priority: input.priority
    };

    data.rooms.unshift(room);
    return room as RoomSummary;
  });
}
