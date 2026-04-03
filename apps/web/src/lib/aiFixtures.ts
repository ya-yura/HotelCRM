import type { AIAssistantItem, AISearchResult, BookingParseResult } from "@hotel-crm/shared/ai";

export const initialAssistantItems: AIAssistantItem[] = [
  {
    id: "ai_daily_1",
    type: "daily_summary",
    title: "По двум заездам нужна проверка оплаты",
    detail: "У Анны Петровой долг 4500, а у Сергея Иванова не отмечена предоплата.",
    confidence: 0.93,
    actionLabel: "Открыть неоплаченные",
    actionTarget: "/payments",
    dismissible: true
  },
  {
    id: "ai_anomaly_1",
    type: "anomaly",
    title: "Статусы по номеру 203 расходятся",
    detail: "На этом устройстве номер ещё грязный, но на другом уже начали уборку.",
    confidence: 0.89,
    actionLabel: "Разобрать конфликт",
    actionTarget: "/today#conflict-inbox",
    dismissible: true
  }
];

export const initialSearchResults: AISearchResult[] = [
  {
    id: "resv_demo_2",
    entityType: "reservation",
    title: "Sergey Ivanov",
    subtitle: "Заезд 26 марта, семейный номер",
    reason: "Совпали имя гостя и ближайший заезд"
  },
  {
    id: "room_203",
    entityType: "room",
    title: "Номер 203",
    subtitle: "Грязный, сегодня заезд",
    reason: "Совпали номер и срочный контекст"
  }
];

export const parsedBookingExample: BookingParseResult = {
  guestName: "Sergey Ivanov",
  checkInDate: "2026-03-26",
  checkOutDate: "2026-03-29",
  roomTypeHint: "family",
  confidence: 0.87,
  needsReview: false
};
