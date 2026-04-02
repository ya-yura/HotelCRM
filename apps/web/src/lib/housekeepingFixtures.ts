import type { HousekeepingTaskSummary } from "@hotel-crm/shared/housekeeping";

export const initialHousekeepingTasks: HousekeepingTaskSummary[] = [
  {
    id: "task_203_checkout",
    roomId: "room_203",
    roomNumber: "203",
    priority: "urgent",
    status: "queued",
    taskType: "checkout_clean",
    note: "Arrival due at 13:30",
    dueLabel: "Due before 13:00",
    assigneeName: "Olga Housekeeping",
    shiftLabel: "Утренняя смена",
    problemNote: "",
    requestedInspection: false,
    checklist: [
      { label: "Сменить белье", done: false },
      { label: "Проверить ванную", done: false }
    ],
    evidence: [],
    consumables: [
      { id: "cons_203_water", item: "Вода", quantity: 2, unitLabel: "бут", unitPrice: 120, postToFolio: false }
    ],
    createdAt: "2026-03-25T11:45:00.000Z",
    updatedAt: "2026-03-25T11:45:00.000Z"
  },
  {
    id: "task_118_inspection",
    roomId: "room_118",
    roomNumber: "118",
    priority: "normal",
    status: "in_progress",
    taskType: "inspection",
    note: "Cleaner reported minibar issue",
    dueLabel: "Inspect this shift",
    assigneeName: "Roman Maintenance",
    shiftLabel: "Дневная поддержка",
    problemNote: "Заедает датчик мини-бара",
    requestedInspection: true,
    checklist: [
      { label: "Проверить датчик", done: false },
      { label: "Сделать фото при дефекте", done: false }
    ],
    evidence: [],
    consumables: [],
    createdAt: "2026-03-25T09:15:00.000Z",
    updatedAt: "2026-03-25T10:30:00.000Z"
  }
];
