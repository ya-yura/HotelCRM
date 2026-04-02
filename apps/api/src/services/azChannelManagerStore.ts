import type {
  AzChannelDashboard,
  AzChannelName,
  AzChannelSyncAction,
  AzChannelSyncResult,
  AzRoom
} from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData, updateHotelData } from "./dataStore";

const channels: AzChannelName[] = ["booking_com", "ostrovok"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isBlockingStatus(status: string) {
  return ["confirmed", "checked_in"].includes(status);
}

function calculateBasePrice(room: AzRoom, dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  const dayOfWeek = date.getDay();
  const exact = room.priceRules.find((rule) => rule.daysOfWeek.includes(dayOfWeek));
  const fallback = room.priceRules.find((rule) => rule.daysOfWeek.length === 0) ?? room.priceRules[0];
  const rule = exact ?? fallback;

  if (!rule) {
    return 3000;
  }

  if (typeof rule.fixedPrice === "number") {
    return rule.fixedPrice;
  }

  return Math.round(3000 * rule.multiplier);
}

async function findNextAvailableDate(propertyId: string, roomId: string, today: string) {
  const bookings = (await getHotelData()).azBookings
    .filter(
      (booking) =>
        booking.propertyId === propertyId &&
        booking.roomId === roomId &&
        isBlockingStatus(booking.status) &&
        booking.dates.checkOut >= today
    )
    .sort((left, right) => left.dates.checkOut.localeCompare(right.dates.checkOut));

  return bookings[0]?.dates.checkOut ?? today;
}

export async function getAzChannelDashboard(propertyId: string): Promise<AzChannelDashboard> {
  const data = await getHotelData();
  const today = todayKey();

  const rooms = await Promise.all(
    data.azRooms
      .filter((room) => room.propertyId === propertyId)
      .sort((left, right) => left.number.localeCompare(right.number, "ru"))
      .map(async (room) => {
        const hasBlockingBooking = data.azBookings.some(
          (booking) =>
            booking.propertyId === propertyId &&
            booking.roomId === room.id &&
            isBlockingStatus(booking.status) &&
            booking.dates.checkIn <= today &&
            booking.dates.checkOut > today
        );

        return {
          roomId: room.id,
          roomNumber: room.number,
          roomType: room.type,
          roomStatus: room.status,
          available: !hasBlockingBooking && !["occupied", "dirty"].includes(room.status),
          nextAvailableDate: await findNextAvailableDate(propertyId, room.id, today),
          basePrice: calculateBasePrice(room, today),
          channels: channels.map((channel) => {
            const inventoryRecord = data.azChannelSyncRecords
              .filter(
                (record) =>
                  record.propertyId === propertyId &&
                  record.roomId === room.id &&
                  record.channel === channel &&
                  record.action === "inventory"
              )
              .sort((left, right) => right.syncedAt.localeCompare(left.syncedAt))[0];
            const priceRecord = data.azChannelSyncRecords
              .filter(
                (record) =>
                  record.propertyId === propertyId &&
                  record.roomId === room.id &&
                  record.channel === channel &&
                  record.action === "prices"
              )
              .sort((left, right) => right.syncedAt.localeCompare(left.syncedAt))[0];

            return {
              channel,
              inventoryStatus: inventoryRecord?.status ?? "idle",
              inventorySyncedAt: inventoryRecord?.syncedAt,
              priceStatus: priceRecord?.status ?? "idle",
              priceSyncedAt: priceRecord?.syncedAt
            };
          })
        };
      })
  );

  return {
    generatedAt: new Date().toISOString(),
    rooms
  };
}

export async function syncAzChannelData(
  propertyId: string,
  action: AzChannelSyncAction,
  input?: { roomId?: string; channel?: AzChannelName }
): Promise<AzChannelSyncResult> {
  const syncedAt = new Date().toISOString();
  const roomIds = input?.roomId
    ? [input.roomId]
    : (await getHotelData()).azRooms.filter((room) => room.propertyId === propertyId).map((room) => room.id);
  const selectedChannels = input?.channel ? [input.channel] : channels;

  await updateHotelData(async (data) => {
    for (const roomId of roomIds) {
      for (const channel of selectedChannels) {
        data.azChannelSyncRecords.unshift({
          propertyId,
          id: `az_channel_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          roomId,
          channel,
          action,
          status: "success",
          syncedAt,
          message:
            action === "inventory"
              ? "Инвентарь обновлён в mock OTA"
              : "Цена обновлена в mock OTA"
        });
      }
    }
  });

  return {
    processedRooms: roomIds.length,
    processedChannels: selectedChannels.length,
    action,
    syncedAt
  };
}

export function getChannelManagerMockNote() {
  return {
    today: todayKey(),
    bookingComApi: "mock",
    plannedRealIntegration: "Booking.com XML/API"
  };
}
