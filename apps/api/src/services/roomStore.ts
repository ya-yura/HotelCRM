import type { RoomCreate, RoomStatus, RoomSummary } from "@hotel-crm/shared/rooms";
import { getHotelData, updateHotelData } from "./dataStore";

export function buildRoomOperationalState(status: RoomStatus) {
  switch (status) {
    case "available":
      return {
        readiness: "clean" as const,
        readinessLabel: "Готов",
        housekeepingNote: "Ready for check-in",
        nextAction: "Can be assigned immediately",
        occupancyLabel: "Free tonight"
      };
    case "reserved":
      return {
        readiness: "clean" as const,
        readinessLabel: "Под ближайший заезд",
        housekeepingNote: "Reserved for upcoming guest",
        nextAction: "Protect from reassignment",
        occupancyLabel: "Arrival expected"
      };
    case "occupied":
      return {
        readiness: "occupied" as const,
        readinessLabel: "Заселен",
        housekeepingNote: "Guest currently in room",
        nextAction: "Hold until checkout",
        occupancyLabel: "Occupied now"
      };
    case "dirty":
      return {
        readiness: "dirty" as const,
        readinessLabel: "Грязный",
        housekeepingNote: "Requires cleaning",
        nextAction: "Send to housekeeping queue",
        occupancyLabel: "Not guest-ready"
      };
    case "cleaning":
      return {
        readiness: "dirty" as const,
        readinessLabel: "Уборка идет",
        housekeepingNote: "Cleaning in progress",
        nextAction: "Wait for completion and inspection",
        occupancyLabel: "Cleaning now"
      };
    case "inspected":
      return {
        readiness: "inspected" as const,
        readinessLabel: "Проверен",
        housekeepingNote: "Cleaned and awaiting release",
        nextAction: "Approve room to available",
        occupancyLabel: "Inspected"
      };
    case "blocked_maintenance":
      return {
        readiness: "blocked" as const,
        readinessLabel: "Заблокирован",
        housekeepingNote: "Maintenance block active",
        nextAction: "Keep out of sale",
        occupancyLabel: "Blocked from sale"
      };
    case "out_of_service":
      return {
        readiness: "maintenance_required" as const,
        readinessLabel: "Вне сервиса",
        housekeepingNote: "Out of service",
        nextAction: "Needs manual return-to-service",
        occupancyLabel: "Unavailable"
      };
  }
}

export async function listRooms(propertyId: string) {
  return (await getHotelData()).rooms
    .filter((room) => room.propertyId === propertyId)
    .sort((left, right) =>
      `${left.zone ?? ""}${left.floor ?? ""}${left.number}`.localeCompare(
        `${right.zone ?? ""}${right.floor ?? ""}${right.number}`
      )
    );
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
    const description = buildRoomOperationalState(status);
    const nextPriority: RoomSummary["priority"] =
      status === "blocked_maintenance"
        ? "blocked"
        : room.priority === "blocked"
          ? "normal"
          : room.priority;
    const updated: typeof data.rooms[number] = {
      ...room,
      status,
      readiness: description.readiness,
      readinessLabel: description.readinessLabel,
      housekeepingNote: description.housekeepingNote,
      nextAction: description.nextAction,
      occupancyLabel: description.occupancyLabel,
      priority: nextPriority,
      lastCleanedAt:
        status === "available" || status === "inspected" ? new Date().toISOString() : room.lastCleanedAt,
      outOfOrderReason: status === "blocked_maintenance" || status === "out_of_service" ? room.outOfOrderReason : "",
      activeMaintenanceIncidentId:
        status === "blocked_maintenance" || status === "out_of_service"
          ? room.activeMaintenanceIncidentId ?? null
          : null
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
      unitKind: input.unitKind,
      status: "available",
      readiness: "clean",
      readinessLabel: "Готов",
      housekeepingNote: "Ready for check-in",
      nextAction: "Can be assigned immediately",
      occupancyLabel: "Free tonight",
      priority: input.priority,
      floor: input.floor,
      zone: input.zone,
      occupancyLimit: input.occupancyLimit,
      amenities: input.amenities,
      minibarEnabled: input.minibarEnabled,
      lastCleanedAt: null,
      nextArrivalLabel: input.nextArrivalLabel,
      outOfOrderReason: "",
      activeMaintenanceIncidentId: null,
      glampingMetadata: input.glampingMetadata
    };

    data.rooms.unshift(room);
    return room as RoomSummary;
  });
}
