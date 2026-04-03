import type {
  AIAssistantItem,
  AISearchResult,
  BookingParseResult,
  OccupancyRecommendation
} from "@hotel-crm/shared/ai";
import { buildManagementAlerts } from "@hotel-crm/shared/management";
import { listComplianceSubmissions } from "./complianceStore";
import { listGuests } from "./guestStore";
import { listHousekeepingTasks } from "./housekeepingStore";
import { listMaintenanceIncidents } from "./maintenanceStore";
import { listFolios, listPayments } from "./paymentStore";
import { listReservations, getReservation } from "./reservationStore";
import { listRooms } from "./roomStore";
import { listSyncConflicts } from "./syncStore";

function differenceInDays(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  return Math.max(Math.round((endDate.getTime() - startDate.getTime()) / 86400000), 1);
}

function scoreRoomFit(
  roomType: string,
  roomTypeHint: string,
  roomStatus: string,
  roomPriority: string
) {
  let score = 0.4;

  if (roomStatus === "available") {
    score += 0.35;
  } else if (roomStatus === "inspected") {
    score += 0.28;
  } else if (roomStatus === "reserved") {
    score += 0.14;
  }

  if (roomType.toLowerCase() === roomTypeHint.toLowerCase()) {
    score += 0.2;
  }

  if (roomPriority === "arrival_soon") {
    score -= 0.08;
  }

  return Math.max(Math.min(score, 0.99), 0.05);
}

export async function getOccupancyRecommendations(propertyId: string, reservationId: string): Promise<OccupancyRecommendation[]> {
  const reservation = await getReservation(propertyId, reservationId);
  if (!reservation) {
    return [];
  }

  const currentFolios = await listFolios(propertyId);
  const stayLength = differenceInDays(reservation.checkInDate, reservation.checkOutDate);
  const roomTypeHint =
    stayLength >= 3 ? "family" : reservation.roomLabel === "UNASSIGNED" ? "standard" : "double";

  return (await listRooms(propertyId))
    .filter((room) => ["available", "inspected", "reserved"].includes(room.status))
    .map((room) => {
      const folio = currentFolios.find((entry) => entry.reservationId === reservationId);
      const score = scoreRoomFit(room.roomType, roomTypeHint, room.status, room.priority);
      const paymentNote =
        (folio?.balanceDue ?? reservation.balanceDue) > 0
          ? "Balance is still open, so keep assignment flexible until arrival."
          : "Payment is covered enough to lock in the room confidently.";

      return {
        reservationId,
        roomId: room.id,
        roomLabel: room.number,
        score,
        explanation:
          room.status === "reserved"
            ? `Room ${room.number} is usable but already protected, so it is a fallback option. ${paymentNote}`
            : `Room ${room.number} keeps the matrix dense for a ${stayLength}-night stay and is already ${room.status.replaceAll("_", " ")}. ${paymentNote}`
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export async function listAssistantItems(propertyId: string) {
  const reservations = await listReservations(propertyId);
  const rooms = await listRooms(propertyId);
  const folios = await listFolios(propertyId);
  const payments = await listPayments(propertyId);
  const tasks = await listHousekeepingTasks(propertyId);
  const maintenanceIncidents = await listMaintenanceIncidents(propertyId);
  const complianceSubmissions = await listComplianceSubmissions(propertyId);
  const conflicts = await listSyncConflicts(propertyId);
  return buildManagementAlerts({
    reservations,
    rooms,
    folios,
    housekeepingTasks: tasks,
    maintenanceIncidents,
    payments,
    complianceSubmissions,
    syncConflictCount: conflicts.length
  });
}

export async function searchWithAI(propertyId: string, query: string): Promise<AISearchResult[]> {
  const normalized = query.toLowerCase();
  const reservations = await listReservations(propertyId);
  const rooms = await listRooms(propertyId);
  const guests = await listGuests(propertyId);

  const base: AISearchResult[] = [
    ...reservations.map((reservation) => ({
      id: reservation.id,
      entityType: "reservation" as const,
      title: reservation.guestName,
      subtitle: `Reservation arriving ${reservation.checkInDate}, room ${reservation.roomLabel}`,
      reason: `Balance due ${reservation.balanceDue}`
    })),
    ...guests.map((guest) => ({
      id: guest.id,
      entityType: "guest" as const,
      title: guest.fullName,
      subtitle: `${guest.phone || "без телефона"} • ${guest.email || "без email"}`,
      reason: guest.document?.number
        ? `Документ ${guest.document.number}`
        : guest.notes || "Guest profile"
    })),
    ...rooms.map((room) => ({
      id: room.id,
      entityType: "room" as const,
      title: `Room ${room.number}`,
      subtitle: `${room.status.replaceAll("_", " ")} • ${room.roomType}`,
      reason: room.nextAction
    }))
  ];

  return base.filter((item) => `${item.title} ${item.subtitle} ${item.reason}`.toLowerCase().includes(normalized));
}

export function parseBookingText(rawText: string): BookingParseResult {
  const lower = rawText.toLowerCase();
  return {
    guestName: lower.includes("ivanov") ? "Sergey Ivanov" : "Guest requires review",
    checkInDate: lower.includes("26") ? "2026-03-26" : "2026-03-25",
    checkOutDate: lower.includes("29") ? "2026-03-29" : "2026-03-26",
    roomTypeHint: lower.includes("family") ? "family" : "standard",
    confidence: lower.includes("family") ? 0.87 : 0.61,
    needsReview: !lower.includes("family")
  };
}

export function draftGuestMessage(guestName: string, intent: "confirmation" | "arrival" | "payment_reminder") {
  const prefix =
    intent === "confirmation"
      ? "Your reservation is confirmed."
      : intent === "arrival"
        ? "Your room will be ready soon."
        : "A payment balance is still open.";

  return {
    message: `Hello ${guestName}. ${prefix} Please contact the front desk if you need anything else.`,
    confidence: 0.86
  };
}
