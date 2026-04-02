import type { SyncConflict, SyncQueueItem } from "@hotel-crm/shared/sync";

export const initialSyncQueue: SyncQueueItem[] = [
  {
    id: "sync_1",
    entityType: "reservation",
    entityId: "resv_demo_2",
    operation: "create",
    action: "create_reservation",
    payloadJson: "{\"idempotencyKey\":\"demo_2\"}",
    localVersion: 1,
    status: "queued",
    summary: "Бронь Сергея Иванова ждёт отправки",
    lastAttemptLabel: "Ещё не отправлено",
    retryCount: 0
  },
  {
    id: "sync_2",
    entityType: "room",
    entityId: "room_203",
    operation: "update",
    action: "update_room_status",
    payloadJson: "{\"status\":\"dirty\"}",
    localVersion: 4,
    status: "failed_conflict",
    summary: "Номер 203 отмечен как грязный на этом устройстве",
    lastAttemptLabel: "Конфликт обнаружен 2 минуты назад",
    retryCount: 1
  }
];

export const initialSyncConflicts: SyncConflict[] = [
  {
    id: "conflict_room_203",
    entityType: "room",
    entityId: "room_203",
    localSummary: "На этом устройстве номер ещё грязный после выезда",
    serverSummary: "На сервере уборка уже начата другим сотрудником",
    recommendedAction: "Оставить серверное состояние и заново открыть задачу на уборку"
  }
];
