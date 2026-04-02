import type { RoomSummary } from "@hotel-crm/shared/rooms";

export const initialRooms: RoomSummary[] = [
  {
    id: "room_101",
    number: "101",
    roomType: "Стандарт",
    status: "available",
    housekeepingNote: "Готов к заселению",
    nextAction: "Держать свободным для заездов",
    occupancyLabel: "Свободен сегодня",
    priority: "normal"
  },
  {
    id: "room_203",
    number: "203",
    roomType: "Двухместный",
    status: "dirty",
    housekeepingNote: "Гость выехал, нужна уборка",
    nextAction: "Начать уборку до заезда в 13:30",
    occupancyLabel: "Сегодня заезд",
    priority: "arrival_soon"
  },
  {
    id: "room_305",
    number: "305",
    roomType: "Семейный",
    status: "blocked_maintenance",
    housekeepingNote: "Сообщили о протечке в ванной",
    nextAction: "Держать в блоке до осмотра",
    occupancyLabel: "Недоступен",
    priority: "blocked"
  }
];
