import type {
  AzBookingStatus,
  AzTodayBookingPreview,
  AzTodayDashboard,
  AzTodayTaskPreview
} from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData } from "./dataStore";
import { listAzHousekeepingTasks } from "./azHousekeepingStore";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isExcluded(status: AzBookingStatus) {
  return ["cancelled", "no_show"].includes(status);
}

async function toBookingPreview(
  propertyId: string,
  bookingId: string,
  guestId: string,
  roomId: string,
  status: AzBookingStatus,
  dateLabel: string
): Promise<AzTodayBookingPreview> {
  const data = await getHotelData();
  const guest = data.azGuests.find((entry) => entry.propertyId === propertyId && entry.id === guestId);
  const room = data.azRooms.find((entry) => entry.propertyId === propertyId && entry.id === roomId);

  return {
    id: bookingId,
    guestName: guest?.name ?? "Гость",
    roomNumber: room?.number ?? "—",
    status,
    dateLabel
  };
}

function toTaskPreview(task: Awaited<ReturnType<typeof listAzHousekeepingTasks>>[number]): AzTodayTaskPreview {
  return {
    id: task.id,
    roomNumber: task.roomNumber,
    roomType: task.roomType,
    status: task.status,
    assignee: task.assignee,
    guestName: task.guestName
  };
}

export async function getAzTodayDashboard(
  propertyId: string,
  options?: { assigneeFilter?: string; limitedScope?: boolean }
): Promise<AzTodayDashboard> {
  const data = await getHotelData();
  const date = todayKey();
  const rooms = data.azRooms.filter((room) => room.propertyId === propertyId);
  const bookings = data.azBookings.filter((booking) => booking.propertyId === propertyId && !isExcluded(booking.status));
  const scopedTasks = await listAzHousekeepingTasks(propertyId, options?.assigneeFilter);
  const fullTasks = await listAzHousekeepingTasks(propertyId);

  const arrivals = await Promise.all(
    bookings
      .filter((booking) => booking.dates.checkIn === date && (options?.limitedScope ? booking.status === "checked_in" : true))
      .slice(0, 6)
      .map((booking) =>
        toBookingPreview(propertyId, booking.id, booking.guestId, booking.roomId, booking.status, "Заезд сегодня")
      )
  );

  const departures = await Promise.all(
    bookings
      .filter((booking) => booking.dates.checkOut === date && (options?.limitedScope ? booking.status === "checked_in" || booking.status === "checked_out" : true))
      .slice(0, 6)
      .map((booking) =>
        toBookingPreview(propertyId, booking.id, booking.guestId, booking.roomId, booking.status, "Выезд сегодня")
      )
  );

  const occupiedRooms = rooms.filter((room) => room.status === "occupied").length;
  const readyRooms = rooms.filter((room) => room.status === "clean" || room.status === "available").length;
  const dirtyRooms = options?.limitedScope
    ? scopedTasks.filter((task) => task.roomStatus === "dirty").length
    : rooms.filter((room) => room.status === "dirty").length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;

  return {
    date,
    scope: options?.limitedScope ? "staff" : "full",
    arrivalsCount: options?.limitedScope ? arrivals.length : bookings.filter((booking) => booking.dates.checkIn === date).length,
    departuresCount: options?.limitedScope ? departures.length : bookings.filter((booking) => booking.dates.checkOut === date).length,
    occupancyRate,
    occupiedRooms,
    readyRooms,
    dirtyRooms,
    tasksInProgress: scopedTasks.filter((task) => task.status === "in_progress").length,
    myTasksCount: scopedTasks.length,
    arrivals,
    departures,
    housekeepingTasks: (options?.limitedScope ? scopedTasks : fullTasks).slice(0, 6).map(toTaskPreview)
  };
}
