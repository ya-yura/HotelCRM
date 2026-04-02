import type { AzChannelName } from "@hotel-crm/shared/features/azhotel_core";

export function channelLabel(channel: AzChannelName) {
  switch (channel) {
    case "booking_com":
      return "Booking.com";
    case "ostrovok":
      return "Ostrovok";
  }
}

export function syncStatusLabel(status: "idle" | "success" | "failed") {
  switch (status) {
    case "idle":
      return "Ещё не отправляли";
    case "success":
      return "Обновлено";
    case "failed":
      return "Ошибка";
  }
}
