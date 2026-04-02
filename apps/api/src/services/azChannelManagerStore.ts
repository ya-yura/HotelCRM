import type {
  AzBookingSourceMetric,
  AzChannelBookingIngest,
  AzChannelDashboard,
  AzChannelName,
  AzChannelSyncAction,
  AzChannelSyncResult,
  AzChannelSyncTask,
  AzRoom
} from "@hotel-crm/shared/features/azhotel_core";
import type { ReservationCreate } from "@hotel-crm/shared/reservations";
import { getHotelData, updateHotelData } from "./dataStore";
import { getAzChannelAdapter } from "./azChannelAdapters";
import { createReservation, updateReservation } from "./reservationStore";

const defaultChannels: AzChannelName[] = ["booking_com", "ostrovok", "yandex_travel"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isBlockingStatus(status: string) {
  return !["cancelled", "checked_out", "no_show"].includes(status);
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

function normalizeRoomTypeId(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "_");
}

function getSourceMetric(
  reservations: Awaited<ReturnType<typeof getHotelData>>["reservations"],
  source: AzBookingSourceMetric["source"]
): AzBookingSourceMetric {
  const scoped = reservations.filter((reservation) => {
    if (source === "walk_in") {
      return reservation.source === "walk_in";
    }
    if (source === "phone") {
      return reservation.source === "phone" || reservation.source === "whatsapp";
    }
    return reservation.source === source;
  });

  const revenue = scoped.reduce((sum, reservation) => sum + (reservation.totalAmount ?? 0), 0);
  const commissionCost = scoped.reduce(
    (sum, reservation) => sum + (reservation.totalAmount ?? 0) * (reservation.sourceAttribution?.commissionRate ?? 0),
    0
  );

  return {
    source,
    reservations: scoped.length,
    revenue,
    commissionCost
  };
}

async function findNextAvailableDate(propertyId: string, roomId: string, today: string) {
  const data = await getHotelData();
  const bookings = data.azBookings
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

async function appendTaskAndMessage(input: {
  propertyId: string;
  channel: AzChannelName;
  action: AzChannelSyncAction;
  scope?: AzChannelSyncTask["scope"];
  roomTypeId?: string | null;
  reservationId?: string | null;
  status: AzChannelSyncTask["status"];
  processedItems: number;
  message: string;
  payloadSummary: string;
  externalBookingId?: string;
  direction?: "outbound" | "inbound";
  type?: "inventory" | "prices" | "booking" | "cancellation" | "modification";
}) {
  const queuedAt = new Date().toISOString();
  const correlationId = `chan_${input.channel}_${input.action}_${Date.now()}`;

  await updateHotelData(async (data) => {
    data.azChannelSyncTasks.unshift({
      propertyId: input.propertyId,
      id: `task_${correlationId}`,
      channel: input.channel,
      action: input.action,
      scope: input.scope ?? "all",
      roomTypeId: input.roomTypeId ?? null,
      reservationId: input.reservationId ?? null,
      status: input.status,
      queuedAt,
      startedAt: queuedAt,
      finishedAt: queuedAt,
      processedItems: input.processedItems,
      message: input.message,
      correlationId
    });

    data.azChannelMessageLogs.unshift({
      propertyId: input.propertyId,
      id: `msg_${correlationId}`,
      channel: input.channel,
      direction: input.direction ?? (input.action === "bookings" ? "inbound" : "outbound"),
      type: input.type ?? (input.action === "prices" ? "prices" : input.action === "inventory" ? "inventory" : "booking"),
      status: input.status === "failed" ? "failed" : "success",
      createdAt: queuedAt,
      relatedRoomTypeId: input.roomTypeId ?? null,
      relatedReservationId: input.reservationId ?? null,
      externalBookingId: input.externalBookingId ?? "",
      payloadSummary: input.payloadSummary,
      correlationId
    });
  });
}

async function hasRoomTypeAvailability(
  propertyId: string,
  roomTypeId: string,
  checkInDate: string,
  checkOutDate: string
) {
  const data = await getHotelData();
  const sellableRooms = data.rooms.filter(
    (room) =>
      room.propertyId === propertyId &&
      normalizeRoomTypeId(room.roomType) === normalizeRoomTypeId(roomTypeId) &&
      !["blocked_maintenance", "out_of_service"].includes(room.status)
  ).length;

  const blockedReservations = data.reservations.filter(
    (reservation) =>
      reservation.propertyId === propertyId &&
      normalizeRoomTypeId(reservation.roomTypeId ?? "") === normalizeRoomTypeId(roomTypeId) &&
      isBlockingStatus(reservation.status) &&
      reservation.checkInDate < checkOutDate &&
      checkInDate < reservation.checkOutDate
  ).length;

  return sellableRooms - blockedReservations > 0;
}

export async function ingestAzChannelBooking(propertyId: string, input: AzChannelBookingIngest) {
  const data = await getHotelData();
  const existing = data.reservations.find(
    (reservation) =>
      reservation.propertyId === propertyId &&
      reservation.sourceAttribution?.channel === input.channel &&
      reservation.sourceAttribution?.externalBookingId === input.externalBookingId
  );

  if (existing) {
    const updated = await updateReservation(propertyId, existing.id, {
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      totalAmount: input.totalAmount,
      balanceDue: Math.max(input.totalAmount - (existing.paidAmount ?? 0), 0),
      sourceAttribution: {
        channel: input.channel,
        externalBookingId: input.externalBookingId,
        externalRoomTypeId: input.roomTypeId,
        externalRatePlanId: "ota_default",
        partnerName: input.partnerName,
        campaignCode: "",
        commissionRate: input.commissionRate
      }
    });

    if (updated) {
      await appendTaskAndMessage({
        propertyId,
        channel: input.channel,
        action: "modifications",
        status: "success",
        processedItems: 1,
        roomTypeId: input.roomTypeId,
        reservationId: updated.id,
        externalBookingId: input.externalBookingId,
        message: "Inbound channel modification applied",
        payloadSummary: `Updated booking ${input.externalBookingId} for ${input.guestName}`,
        type: "modification"
      });
    }

    return updated;
  }

  const available = await hasRoomTypeAvailability(propertyId, input.roomTypeId, input.checkInDate, input.checkOutDate);
  if (!available) {
    await appendTaskAndMessage({
      propertyId,
      channel: input.channel,
      action: "bookings",
      status: "failed",
      processedItems: 0,
      roomTypeId: input.roomTypeId,
      externalBookingId: input.externalBookingId,
      message: "Inbound booking blocked by availability guard",
      payloadSummary: `No inventory left for ${input.roomTypeId} on ${input.checkInDate}-${input.checkOutDate}`,
      type: "booking"
    });
    return false;
  }

  const created = await createReservation(propertyId, {
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    guestEmail: input.guestEmail,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    adultCount: input.adultCount,
    childCount: input.childCount,
    roomTypeId: input.roomTypeId,
    totalAmount: input.totalAmount,
    notes: `Imported from ${input.channel}`,
    source: "ota",
    sourceAttribution: {
      channel: input.channel,
      externalBookingId: input.externalBookingId,
      externalRoomTypeId: input.roomTypeId,
      externalRatePlanId: "ota_default",
      partnerName: input.partnerName,
      campaignCode: "",
      commissionRate: input.commissionRate
    },
    idempotencyKey: `ota_${input.channel}_${input.externalBookingId}`
  } satisfies ReservationCreate);

  const finalized = await updateReservation(propertyId, created.id, {
    status: input.status,
    sourceAttribution: {
      channel: input.channel,
      externalBookingId: input.externalBookingId,
      externalRoomTypeId: input.roomTypeId,
      externalRatePlanId: "ota_default",
      partnerName: input.partnerName,
      campaignCode: "",
      commissionRate: input.commissionRate
    }
  });

  if (finalized) {
    await appendTaskAndMessage({
      propertyId,
      channel: input.channel,
      action: "bookings",
      status: "success",
      processedItems: 1,
      roomTypeId: input.roomTypeId,
      reservationId: finalized.id,
      externalBookingId: input.externalBookingId,
      message: "Inbound channel booking ingested",
      payloadSummary: `Imported ${input.guestName} / ${input.externalBookingId}`,
      type: "booking"
    });
  }

  return finalized;
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
          channels: defaultChannels.map((channel) => {
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

  const sourceMetrics: AzBookingSourceMetric[] = [
    getSourceMetric(data.reservations.filter((reservation) => reservation.propertyId === propertyId), "direct"),
    getSourceMetric(data.reservations.filter((reservation) => reservation.propertyId === propertyId), "ota"),
    getSourceMetric(data.reservations.filter((reservation) => reservation.propertyId === propertyId), "phone"),
    getSourceMetric(data.reservations.filter((reservation) => reservation.propertyId === propertyId), "walk_in"),
    getSourceMetric(data.reservations.filter((reservation) => reservation.propertyId === propertyId), "partner")
  ];

  const totalRevenue = sourceMetrics.reduce((sum, item) => sum + item.revenue, 0);
  const directRevenue = sourceMetrics.find((item) => item.source === "direct")?.revenue ?? 0;
  const propertyFolios = data.folios.filter((folio) => folio.propertyId === propertyId);
  const propertyReservations = data.reservations.filter((reservation) => reservation.propertyId === propertyId);

  return {
    generatedAt: new Date().toISOString(),
    rooms,
    accounts: data.azChannelAccounts.filter((item) => item.propertyId === propertyId),
    roomTypeMappings: data.azRoomTypeMappings.filter((item) => item.propertyId === propertyId),
    ratePlanMappings: data.azRatePlanMappings.filter((item) => item.propertyId === propertyId),
    sourceMetrics,
    recentTasks: data.azChannelSyncTasks
      .filter((item) => item.propertyId === propertyId)
      .sort((left, right) => right.queuedAt.localeCompare(left.queuedAt))
      .slice(0, 8),
    messageLog: data.azChannelMessageLogs
      .filter((item) => item.propertyId === propertyId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 10),
    directBookingSummary: {
      directShareRevenue: totalRevenue > 0 ? Math.round((directRevenue / totalRevenue) * 100) : 0,
      pendingPaymentLinks: propertyFolios.flatMap((folio) => folio.paymentLinks).filter((link) => ["draft", "sent"].includes(link.status)).length,
      provisionalReservations: propertyReservations.filter((reservation) => reservation.source === "direct" && reservation.status === "pending_confirmation").length
    }
  };
}

export async function syncAzChannelData(
  propertyId: string,
  action: Exclude<AzChannelSyncAction, "bookings" | "cancellations" | "modifications">,
  input?: { roomId?: string; channel?: AzChannelName }
): Promise<AzChannelSyncResult> {
  const syncedAt = new Date().toISOString();
  const data = await getHotelData();
  const roomIds = input?.roomId
    ? [input.roomId]
    : data.azRooms.filter((room) => room.propertyId === propertyId).map((room) => room.id);
  const selectedChannels = input?.channel ? [input.channel] : defaultChannels;

  await updateHotelData(async (nextData) => {
    for (const roomId of roomIds) {
      const room = nextData.azRooms.find((entry) => entry.propertyId === propertyId && entry.id === roomId);
      for (const channel of selectedChannels) {
        nextData.azChannelSyncRecords.unshift({
          propertyId,
          id: `az_channel_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          roomId,
          channel,
          action,
          status: "success",
          syncedAt,
          message: getAzChannelAdapter(channel).buildOutboundSummary(action, room?.type ?? roomId)
        });
      }
    }
  });

  await Promise.all(
    selectedChannels.map((channel) =>
      appendTaskAndMessage({
        propertyId,
        channel,
        action,
        status: "success",
        processedItems: roomIds.length,
        message: `${action === "inventory" ? "Inventory" : "Rates"} synchronized`,
        payloadSummary: getAzChannelAdapter(channel).buildOutboundSummary(action)
      })
    )
  );

  return {
    processedRooms: roomIds.length,
    processedChannels: selectedChannels.length,
    action,
    syncedAt
  };
}

export async function pullAzChannelBookings(
  propertyId: string,
  input?: { channel?: AzChannelName }
): Promise<AzChannelSyncResult> {
  const selectedChannels = input?.channel ? [input.channel] : defaultChannels;
  let processedItems = 0;

  for (const channel of selectedChannels) {
    const adapter = getAzChannelAdapter(channel);
    const bookings = adapter.mockPullBookings();
    for (const booking of bookings) {
      const result = await ingestAzChannelBooking(propertyId, booking);
      processedItems += result ? 1 : 0;
    }
  }

  return {
    processedRooms: processedItems,
    processedChannels: selectedChannels.length,
    action: "bookings",
    syncedAt: new Date().toISOString()
  };
}

export function getChannelManagerMockNote() {
  return {
    today: todayKey(),
    providers: defaultChannels,
    bookingComApi: "mock adapter with task queue",
    plannedRealIntegration: "Booking.com / Ostrovok / Yandex Travel adapter bridge"
  };
}
