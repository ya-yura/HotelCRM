import type {
  AzBookingCreate,
  AzBookingStatus,
  AzBookingView
} from "@hotel-crm/shared/features/azhotel_core";

export function azBookingStatusLabel(status: AzBookingStatus) {
  switch (status) {
    case "draft":
      return "Черновик";
    case "confirmed":
      return "Подтверждено";
    case "checked_in":
      return "Заселён";
    case "checked_out":
      return "Выехал";
    case "cancelled":
      return "Отменено";
    case "no_show":
      return "Незаезд";
  }
}

export function azChannelLabel(channel: string) {
  switch (channel.toLowerCase()) {
    case "phone":
      return "Телефон";
    case "whatsapp":
      return "WhatsApp";
    case "ota":
      return "Агрегатор";
    case "walk_in":
      return "С улицы";
    default:
      return channel;
  }
}

export function bookingToneClass(status: AzBookingView["status"]) {
  switch (status) {
    case "confirmed":
    case "checked_in":
      return "booked";
    case "draft":
      return "pending";
    case "cancelled":
    case "no_show":
      return "cancelled";
    case "checked_out":
      return "completed";
  }
}

export function createDefaultBookingForm(roomId = ""): AzBookingCreate {
  return {
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    roomId,
    dates: {
      checkIn: "2026-03-25",
      checkOut: "2026-03-26"
    },
    status: "draft",
    services: [],
    total: 0,
    channel: "phone"
  };
}
