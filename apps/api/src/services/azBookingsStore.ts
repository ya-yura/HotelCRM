import type {
  AzBooking,
  AzBookingCreate,
  AzBookingUpdate,
  AzBookingView,
  AzGuest
} from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData, updateHotelData } from "./dataStore";

function isActiveBookingStatus(status: AzBooking["status"]) {
  return !["cancelled", "checked_out", "no_show"].includes(status);
}

function intersects(
  left: { checkIn: string; checkOut: string },
  right: { checkIn: string; checkOut: string }
) {
  return left.checkIn < right.checkOut && right.checkIn < left.checkOut;
}

function toBookingView(
  booking: AzBooking & { propertyId: string },
  guests: Array<AzGuest & { propertyId: string }>,
  rooms: Array<{ propertyId: string; id: string; number: string; type: string }>
): AzBookingView {
  const guest = guests.find((entry) => entry.propertyId === booking.propertyId && entry.id === booking.guestId);
  const room = rooms.find((entry) => entry.propertyId === booking.propertyId && entry.id === booking.roomId);

  return {
    ...booking,
    guestName: guest?.name ?? "Гость",
    roomNumber: room?.number ?? "—",
    roomType: room?.type ?? ""
  };
}

async function upsertGuest(
  propertyId: string,
  guestName: string,
  guestPhone: string,
  guestEmail: string,
  bookingId: string
) {
  return updateHotelData(async (data) => {
    const existing = data.azGuests.find(
      (guest) =>
        guest.propertyId === propertyId &&
        guest.name.trim().toLowerCase() === guestName.trim().toLowerCase()
    );

    if (existing) {
      existing.contact = {
        phone: guestPhone || existing.contact.phone,
        email: guestEmail || existing.contact.email
      };
      if (!existing.history.includes(bookingId)) {
        existing.history.unshift(bookingId);
      }
      return existing;
    }

    const guest: AzGuest & { propertyId: string } = {
      propertyId,
      id: `az_guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: guestName,
      contact: {
        phone: guestPhone,
        email: guestEmail
      },
      history: [bookingId]
    };
    data.azGuests.unshift(guest);
    return guest;
  });
}

async function findConflict(
  propertyId: string,
  roomId: string,
  dates: { checkIn: string; checkOut: string },
  currentBookingId?: string
) {
  return (await getHotelData()).azBookings.find(
    (booking) =>
      booking.propertyId === propertyId &&
      booking.roomId === roomId &&
      booking.id !== currentBookingId &&
      isActiveBookingStatus(booking.status) &&
      intersects(booking.dates, dates)
  );
}

export async function listAzBookings(propertyId: string, from?: string, to?: string) {
  const data = await getHotelData();
  const items = data.azBookings
    .filter((booking) => booking.propertyId === propertyId)
    .filter((booking) => {
      if (!from && !to) {
        return true;
      }
      const filterDates = {
        checkIn: from ?? booking.dates.checkIn,
        checkOut: to ?? booking.dates.checkOut
      };
      return intersects(booking.dates, filterDates);
    })
    .sort((left, right) => left.dates.checkIn.localeCompare(right.dates.checkIn));

  return items.map((booking) => toBookingView(booking, data.azGuests, data.azRooms));
}

export async function getAzBooking(propertyId: string, bookingId: string) {
  const data = await getHotelData();
  const booking = data.azBookings.find(
    (entry) => entry.propertyId === propertyId && entry.id === bookingId
  );
  if (!booking) {
    return null;
  }

  return toBookingView(booking, data.azGuests, data.azRooms);
}

export async function createAzBooking(propertyId: string, input: AzBookingCreate) {
  const conflict = await findConflict(propertyId, input.roomId, input.dates);
  if (conflict) {
    return false;
  }

  const bookingId = `az_booking_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const guest = await upsertGuest(
    propertyId,
    input.guestName,
    input.guestPhone,
    input.guestEmail,
    bookingId
  );

  return updateHotelData(async (data) => {
    const booking: AzBooking & { propertyId: string } = {
      propertyId,
      id: bookingId,
      guestId: guest.id,
      roomId: input.roomId,
      dates: input.dates,
      status: input.status,
      services: input.services,
      total: input.total,
      channel: input.channel
    };
    data.azBookings.unshift(booking);
    return toBookingView(booking, data.azGuests, data.azRooms);
  });
}

export async function updateAzBooking(propertyId: string, bookingId: string, patch: AzBookingUpdate) {
  const data = await getHotelData();
  const current = data.azBookings.find(
    (entry) => entry.propertyId === propertyId && entry.id === bookingId
  );
  if (!current) {
    return null;
  }

  const nextRoomId = patch.roomId ?? current.roomId;
  const nextDates = patch.dates ?? current.dates;
  const conflict = await findConflict(propertyId, nextRoomId, nextDates, bookingId);
  if (conflict) {
    return false;
  }

  const guest = patch.guestName
    ? await upsertGuest(
        propertyId,
        patch.guestName,
        patch.guestPhone ?? "",
        patch.guestEmail ?? "",
        bookingId
      )
    : data.azGuests.find((entry) => entry.propertyId === propertyId && entry.id === current.guestId);

  return updateHotelData(async (nextData) => {
    const index = nextData.azBookings.findIndex(
      (entry) => entry.propertyId === propertyId && entry.id === bookingId
    );
    if (index === -1) {
      return null;
    }

    nextData.azBookings[index] = {
      ...nextData.azBookings[index],
      ...(guest ? { guestId: guest.id } : {}),
      ...(patch.roomId ? { roomId: patch.roomId } : {}),
      ...(patch.dates ? { dates: patch.dates } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.services ? { services: patch.services } : {}),
      ...(typeof patch.total === "number" ? { total: patch.total } : {}),
      ...(patch.channel ? { channel: patch.channel } : {})
    };

    return toBookingView(nextData.azBookings[index], nextData.azGuests, nextData.azRooms);
  });
}
