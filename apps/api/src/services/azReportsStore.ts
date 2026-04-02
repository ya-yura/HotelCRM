import type {
  AzBooking,
  AzReportChannelMetric,
  AzReportSeriesPoint,
  AzReportSummary
} from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData } from "./dataStore";

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffNights(checkIn: string, checkOut: string) {
  const start = startOfDay(checkIn).getTime();
  const end = startOfDay(checkOut).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

function iterDays(from: string, to: string) {
  const days: string[] = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(toKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function isReportBooking(status: AzBooking["status"]) {
  return !["draft", "cancelled", "no_show"].includes(status);
}

function overlapsDay(booking: AzBooking, day: string) {
  return booking.dates.checkIn <= day && booking.dates.checkOut > day;
}

export async function getAzReportSummary(propertyId: string, from: string, to: string): Promise<AzReportSummary> {
  const data = await getHotelData();
  const rooms = data.azRooms.filter((room) => room.propertyId === propertyId);
  const bookings = data.azBookings.filter(
    (booking) =>
      booking.propertyId === propertyId &&
      isReportBooking(booking.status) &&
      booking.dates.checkIn <= to &&
      booking.dates.checkOut >= from
  );
  const days = iterDays(from, to);
  const channelMap = new Map<string, AzReportChannelMetric>();

  const series: AzReportSeriesPoint[] = days.map((day) => {
    const dayBookings = bookings.filter((booking) => booking.dates.checkIn === day);
    const occupiedRooms = bookings.filter((booking) => overlapsDay(booking, day)).length;
    const dayRevenue = bookings
      .filter((booking) => overlapsDay(booking, day))
      .reduce((sum, booking) => sum + booking.total / diffNights(booking.dates.checkIn, booking.dates.checkOut), 0);

    for (const booking of dayBookings) {
      const current = channelMap.get(booking.channel) ?? {
        channel: booking.channel,
        bookings: 0,
        revenue: 0
      };
      current.bookings += 1;
      current.revenue += booking.total;
      channelMap.set(booking.channel, current);
    }

    return {
      date: day,
      bookings: dayBookings.length,
      occupiedRooms,
      occupancyRate: rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0,
      revenue: Math.round(dayRevenue)
    };
  });

  const totalRevenue = Math.round(series.reduce((sum, point) => sum + point.revenue, 0));
  const soldRoomNights = series.reduce((sum, point) => sum + point.occupiedRooms, 0);
  const availableRoomNights = rooms.length * Math.max(days.length, 1);

  return {
    from,
    to,
    totalRevenue,
    totalBookings: bookings.filter((booking) => booking.dates.checkIn >= from && booking.dates.checkIn <= to).length,
    avgOccupancyRate:
      series.length > 0
        ? Math.round(series.reduce((sum, point) => sum + point.occupancyRate, 0) / series.length)
        : 0,
    adr: soldRoomNights > 0 ? Math.round(totalRevenue / soldRoomNights) : 0,
    soldRoomNights,
    availableRoomNights,
    channels: Array.from(channelMap.values()).sort((left, right) => right.revenue - left.revenue),
    series
  };
}

export function buildAzReportCsv(report: AzReportSummary) {
  const lines = [
    ["Период", `${report.from} - ${report.to}`],
    ["Выручка", String(report.totalRevenue)],
    ["Бронирования", String(report.totalBookings)],
    ["Средняя загрузка (%)", String(report.avgOccupancyRate)],
    ["ADR", String(report.adr)],
    ["Проданные номеро-ночи", String(report.soldRoomNights)],
    ["Доступные номеро-ночи", String(report.availableRoomNights)],
    [],
    ["Дата", "Бронирования", "Занятые номера", "Загрузка (%)", "Выручка"]
  ];

  for (const point of report.series) {
    lines.push([
      point.date,
      String(point.bookings),
      String(point.occupiedRooms),
      String(point.occupancyRate),
      String(point.revenue)
    ]);
  }

  lines.push([]);
  lines.push(["Канал", "Бронирования", "Выручка"]);
  for (const channel of report.channels) {
    lines.push([channel.channel, String(channel.bookings), String(channel.revenue)]);
  }

  return lines
    .map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}
