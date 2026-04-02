import type { AzRoom, AzRoomCreate } from "@hotel-crm/shared/features/azhotel_core";

export function azRoomStatusLabel(status: AzRoom["status"]) {
  switch (status) {
    case "available":
      return "Свободен";
    case "occupied":
      return "Заселён";
    case "clean":
      return "Чистый";
    case "dirty":
      return "Грязный";
  }
}

export function azRoomTypeLabel(type: string) {
  switch (type.toLowerCase()) {
    case "standard":
      return "Стандарт";
    case "double":
      return "Двухместный";
    case "family":
      return "Семейный";
    case "deluxe":
      return "Улучшенный";
    default:
      return type;
  }
}

export function createDefaultAzRoomForm(): AzRoomCreate {
  return {
    type: "standard",
    number: "",
    priceRules: [
      {
        id: `rule_${Date.now()}`,
        title: "Базовый тариф",
        daysOfWeek: [],
        multiplier: 1
      }
    ],
    status: "clean"
  };
}
