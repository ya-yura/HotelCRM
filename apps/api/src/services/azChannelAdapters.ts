import type {
  AzChannelBookingIngest,
  AzChannelName,
  AzChannelSyncAction
} from "@hotel-crm/shared/features/azhotel_core";

export type ChannelInboundBooking = AzChannelBookingIngest;

type AzChannelAdapter = {
  channel: AzChannelName;
  buildOutboundSummary: (action: Exclude<AzChannelSyncAction, "bookings" | "cancellations" | "modifications">, roomTypeId?: string | null) => string;
  mockPullBookings: () => ChannelInboundBooking[];
};

function futureDate(daysAhead: number) {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const adapters: Record<AzChannelName, AzChannelAdapter> = {
  booking_com: {
    channel: "booking_com",
    buildOutboundSummary: (action, roomTypeId) =>
      action === "inventory"
        ? `Booking.com inventory push prepared${roomTypeId ? ` for ${roomTypeId}` : ""}`
        : `Booking.com rate push prepared${roomTypeId ? ` for ${roomTypeId}` : ""}`,
    mockPullBookings: () => [
      {
        channel: "booking_com",
        externalBookingId: `bcom_${Date.now()}`,
        roomTypeId: "double",
        guestName: "Nikolai Petrov",
        guestPhone: "+79994441122",
        guestEmail: "n.petrov@example.com",
        checkInDate: futureDate(3),
        checkOutDate: futureDate(5),
        totalAmount: 8600,
        adultCount: 2,
        childCount: 0,
        commissionRate: 0.17,
        partnerName: "",
        status: "confirmed"
      }
    ]
  },
  ostrovok: {
    channel: "ostrovok",
    buildOutboundSummary: (action, roomTypeId) =>
      action === "inventory"
        ? `Ostrovok inventory snapshot ready${roomTypeId ? ` for ${roomTypeId}` : ""}`
        : `Ostrovok prices ready${roomTypeId ? ` for ${roomTypeId}` : ""}`,
    mockPullBookings: () => [
      {
        channel: "ostrovok",
        externalBookingId: `ostr_${Date.now()}`,
        roomTypeId: "family",
        guestName: "Tatiana Sokolova",
        guestPhone: "+79998887766",
        guestEmail: "tatiana.s@example.com",
        checkInDate: futureDate(2),
        checkOutDate: futureDate(4),
        totalAmount: 9600,
        adultCount: 2,
        childCount: 1,
        commissionRate: 0.15,
        partnerName: "",
        status: "confirmed"
      }
    ]
  },
  yandex_travel: {
    channel: "yandex_travel",
    buildOutboundSummary: (action, roomTypeId) =>
      action === "inventory"
        ? `Yandex Travel availability update ready${roomTypeId ? ` for ${roomTypeId}` : ""}`
        : `Yandex Travel rate update ready${roomTypeId ? ` for ${roomTypeId}` : ""}`,
    mockPullBookings: () => [
      {
        channel: "yandex_travel",
        externalBookingId: `yatravel_${Date.now()}`,
        roomTypeId: "a-frame",
        guestName: "Olena Voronina",
        guestPhone: "+79995556677",
        guestEmail: "olena.v@example.com",
        checkInDate: futureDate(5),
        checkOutDate: futureDate(7),
        totalAmount: 7200,
        adultCount: 2,
        childCount: 0,
        commissionRate: 0.14,
        partnerName: "",
        status: "confirmed"
      }
    ]
  }
};

export function getAzChannelAdapter(channel: AzChannelName) {
  return adapters[channel];
}
