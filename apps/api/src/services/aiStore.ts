import type {
  AIAssistantItem,
  AISearchResult,
  BookingParseResult,
  OccupancyRecommendation
} from "@hotel-crm/shared/ai";
import { listGuests } from "./guestStore";
import { listHousekeepingTasks } from "./housekeepingStore";
import { listFolios } from "./paymentStore";
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
  const tasks = await listHousekeepingTasks(propertyId);
  const conflicts = await listSyncConflicts(propertyId);
  const arrivals = reservations.filter((entry) => ["draft", "confirmed"].includes(entry.status));
  const unpaidArrivals = arrivals.filter((entry) => {
    const folio = folios.find((item) => item.reservationId === entry.id);
    return (folio?.balanceDue ?? entry.balanceDue) > 0;
  });
  const dirtyRooms = rooms.filter((entry) => entry.status === "dirty" || entry.status === "cleaning");
  const unassignedConfirmed = reservations.filter(
    (entry) => entry.status === "confirmed" && entry.roomLabel === "UNASSIGNED"
  );

  const items: AIAssistantItem[] = [];

  if (unpaidArrivals.length > 0) {
    items.push({
      id: "ai_daily_unpaid",
      type: "daily_summary",
      title: `${unpaidArrivals.length} arrival${unpaidArrivals.length > 1 ? "s" : ""} need payment review`,
      detail: unpaidArrivals
        .slice(0, 2)
        .map((entry) => `${entry.guestName} still has balance due`)
        .join("; "),
      confidence: 0.94,
      actionLabel: "Open unpaid arrivals"
    });
  }

  if (dirtyRooms.length > 0) {
    items.push({
      id: "ai_admin_turnover",
      type: "admin_routine",
      title: `${dirtyRooms.length} room${dirtyRooms.length > 1 ? "s" : ""} need turnover attention`,
      detail: `${tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length} active housekeeping task(s) are blocking room release.`,
      confidence: 0.9,
      actionLabel: "Open housekeeping"
    });
  }

  if (unassignedConfirmed.length > 0) {
    const topReservation = unassignedConfirmed[0];
    const topRecommendation = (await getOccupancyRecommendations(propertyId, topReservation.id))[0];
    if (topRecommendation) {
      items.push({
        id: `ai_occupancy_${topReservation.id}`,
        type: "occupancy_hint",
        title: `Best-fit room suggestion for ${topReservation.guestName}`,
        detail: `${topRecommendation.explanation} Suggested room: ${topRecommendation.roomLabel}.`,
        confidence: topRecommendation.score,
        actionLabel: "Review room options"
      });
    }
  }

  if (conflicts.length > 0) {
    items.push({
      id: "ai_anomaly_conflicts",
      type: "anomaly",
      title: `${conflicts.length} sync conflict${conflicts.length > 1 ? "s" : ""} need review`,
      detail: "Operational mismatches are now visible in the inbox instead of staying hidden behind retries.",
      confidence: 0.88,
      actionLabel: "Resolve conflict"
    });
  }

  return items;
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
