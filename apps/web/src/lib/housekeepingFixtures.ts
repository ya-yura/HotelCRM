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
    dueLabel: "Due before 13:00"
  },
  {
    id: "task_118_inspection",
    roomId: "room_118",
    roomNumber: "118",
    priority: "normal",
    status: "in_progress",
    taskType: "inspection",
    note: "Cleaner reported minibar issue",
    dueLabel: "Inspect this shift"
  }
];
