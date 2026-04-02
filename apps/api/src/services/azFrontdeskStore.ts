import type {
  AzBooking,
  AzBookingService,
  AzBookingStatus,
  AzRoom,
  AzSettlement
} from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData, updateHotelData } from "./dataStore";

function isActiveBookingStatus(status: AzBookingStatus) {
  return !["cancelled", "checked_out", "no_show"].includes(status);
}

function intersects(
  left: { checkIn: string; checkOut: string },
  right: { checkIn: string; checkOut: string }
) {
  return left.checkIn < right.checkOut && right.checkIn < left.checkOut;
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function diffNights(checkIn: string, checkOut: string) {
  const start = startOfDay(checkIn).getTime();
  const end = startOfDay(checkOut).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

function listStayDates(checkIn: string, checkOut: string) {
  const dates: Date[] = [];
  let cursor = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function pickRule(room: AzRoom, day: Date) {
  const dayOfWeek = day.getDay();
  const exact = room.priceRules.find((rule) => rule.daysOfWeek.includes(dayOfWeek));
  return exact ?? room.priceRules.find((rule) => rule.daysOfWeek.length === 0) ?? room.priceRules[0];
}

function calculateNightAmount(room: AzRoom, day: Date) {
  const rule = pickRule(room, day);
  if (!rule) {
    return 3000;
  }

  if (typeof rule.fixedPrice === "number") {
    return rule.fixedPrice;
  }

  return Math.round(3000 * rule.multiplier);
}

function normalizeServices(services: AzBookingService[]) {
  return services.map((service) => ({
    ...service,
    total: service.quantity * service.price
  }));
}

async function buildSettlement(
  booking: AzBooking & { propertyId: string },
  room: AzRoom & { propertyId: string },
  services: AzBookingService[]
): Promise<AzSettlement> {
  const normalizedServices = normalizeServices(services);
  const roomAmount = listStayDates(booking.dates.checkIn, booking.dates.checkOut).reduce(
    (sum, day) => sum + calculateNightAmount(room, day),
    0
  );
  const servicesAmount = normalizedServices.reduce((sum, service) => sum + service.total, 0);
  const data = await getHotelData();
  const guest = data.azGuests.find(
    (entry) => entry.propertyId === booking.propertyId && entry.id === booking.guestId
  );

  return {
    bookingId: booking.id,
    guestName: guest?.name ?? "Гость",
    roomId: room.id,
    roomNumber: room.number,
    roomType: room.type,
    status: booking.status,
    nights: diffNights(booking.dates.checkIn, booking.dates.checkOut),
    roomAmount,
    servicesAmount,
    totalAmount: roomAmount + servicesAmount,
    dates: booking.dates,
    services: normalizedServices,
    lines: [
      {
        id: `${booking.id}_room`,
        title: `Проживание ${diffNights(booking.dates.checkIn, booking.dates.checkOut)} ноч.`,
        kind: "room",
        amount: roomAmount
      },
      ...normalizedServices.map((service) => ({
        id: service.id,
        title: `${service.name} x${service.quantity}`,
        kind: "service" as const,
        amount: service.total
      }))
    ]
  };
}

async function findBooking(propertyId: string, bookingId: string) {
  return (
    (await getHotelData()).azBookings.find(
      (entry) => entry.propertyId === propertyId && entry.id === bookingId
    ) ?? null
  );
}

async function findRoom(propertyId: string, roomId: string) {
  return (
    (await getHotelData()).azRooms.find((entry) => entry.propertyId === propertyId && entry.id === roomId) ??
    null
  );
}

async function hasRoomConflict(
  propertyId: string,
  bookingId: string,
  roomId: string,
  dates: { checkIn: string; checkOut: string }
) {
  return (await getHotelData()).azBookings.some(
    (entry) =>
      entry.propertyId === propertyId &&
      entry.id !== bookingId &&
      entry.roomId === roomId &&
      isActiveBookingStatus(entry.status) &&
      intersects(entry.dates, dates)
  );
}

export async function quoteAzCheckIn(propertyId: string, bookingId: string, roomId: string, services: AzBookingService[]) {
  const booking = await findBooking(propertyId, bookingId);
  if (!booking) {
    return null;
  }

  if (!["draft", "confirmed"].includes(booking.status)) {
    return "INVALID_STATUS" as const;
  }

  const room = await findRoom(propertyId, roomId);
  if (!room) {
    return false;
  }

  if (room.status === "dirty") {
    return "ROOM_NOT_READY" as const;
  }

  if (await hasRoomConflict(propertyId, booking.id, room.id, booking.dates)) {
    return "ROOM_ALREADY_BOOKED" as const;
  }

  return buildSettlement(booking, room, services);
}

export async function executeAzCheckIn(
  propertyId: string,
  bookingId: string,
  roomId: string,
  services: AzBookingService[]
) {
  const quote = await quoteAzCheckIn(propertyId, bookingId, roomId, services);
  if (!quote || typeof quote === "string") {
    return quote;
  }

  return updateHotelData(async (data) => {
    const bookingIndex = data.azBookings.findIndex(
      (entry) => entry.propertyId === propertyId && entry.id === bookingId
    );
    if (bookingIndex === -1) {
      return null;
    }

    const currentBooking = data.azBookings[bookingIndex];
    const previousRoomId = currentBooking.roomId;
    const nextRoomIndex = data.azRooms.findIndex(
      (entry) => entry.propertyId === propertyId && entry.id === roomId
    );
    if (nextRoomIndex === -1) {
      return false;
    }

    data.azBookings[bookingIndex] = {
      ...currentBooking,
      roomId,
      status: "checked_in",
      services: quote.services,
      total: quote.totalAmount
    };
    data.azRooms[nextRoomIndex] = {
      ...data.azRooms[nextRoomIndex],
      status: "occupied"
    };

    if (previousRoomId !== roomId) {
      const previousRoomIndex = data.azRooms.findIndex(
        (entry) => entry.propertyId === propertyId && entry.id === previousRoomId
      );
      if (previousRoomIndex >= 0) {
        const hasCheckedInGuest = data.azBookings.some(
          (entry) =>
            entry.propertyId === propertyId &&
            entry.id !== bookingId &&
            entry.roomId === previousRoomId &&
            entry.status === "checked_in"
        );
        data.azRooms[previousRoomIndex] = {
          ...data.azRooms[previousRoomIndex],
          status: hasCheckedInGuest ? "occupied" : "clean"
        };
      }
    }

    return {
      ...quote,
      status: "checked_in"
    };
  });
}

export async function quoteAzCheckOut(propertyId: string, bookingId: string, services: AzBookingService[]) {
  const booking = await findBooking(propertyId, bookingId);
  if (!booking) {
    return null;
  }

  if (booking.status !== "checked_in") {
    return "INVALID_STATUS" as const;
  }

  const room = await findRoom(propertyId, booking.roomId);
  if (!room) {
    return false;
  }

  return buildSettlement(booking, room, services);
}

export async function executeAzCheckOut(propertyId: string, bookingId: string, services: AzBookingService[]) {
  const quote = await quoteAzCheckOut(propertyId, bookingId, services);
  if (!quote || quote === "INVALID_STATUS") {
    return quote;
  }

  return updateHotelData(async (data) => {
    const bookingIndex = data.azBookings.findIndex(
      (entry) => entry.propertyId === propertyId && entry.id === bookingId
    );
    if (bookingIndex === -1) {
      return null;
    }

    const roomIndex = data.azRooms.findIndex(
      (entry) => entry.propertyId === propertyId && entry.id === data.azBookings[bookingIndex].roomId
    );
    if (roomIndex === -1) {
      return false;
    }

    data.azBookings[bookingIndex] = {
      ...data.azBookings[bookingIndex],
      status: "checked_out",
      services: quote.services,
      total: quote.totalAmount
    };
    data.azRooms[roomIndex] = {
      ...data.azRooms[roomIndex],
      status: "dirty"
    };

    data.azHousekeepingTasks.unshift({
      propertyId,
      id: `az_hk_${data.azRooms[roomIndex].id}_${Date.now()}`,
      roomId: data.azRooms[roomIndex].id,
      date: new Date().toISOString().slice(0, 10),
      status: "queued",
      assignee: ""
    });

    return {
      ...quote,
      status: "checked_out"
    };
  });
}
