import type { AzHousekeepingTaskStatus, AzRoomStatus } from "@hotel-crm/shared/features/azhotel_core";

export function azHousekeepingStatusLabel(status: AzHousekeepingTaskStatus) {
  switch (status) {
    case "queued":
      return "В очереди";
    case "in_progress":
      return "В работе";
    case "done":
      return "Готово";
    case "skipped":
      return "Пропущено";
  }
}

export function azRoomStatusTone(status: AzRoomStatus) {
  switch (status) {
    case "clean":
    case "available":
      return "status-available";
    case "occupied":
      return "status-occupied";
    case "dirty":
      return "status-dirty";
  }
}
