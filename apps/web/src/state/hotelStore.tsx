import {
  createContext,
  useEffect,
  useContext,
  useState,
  type PropsWithChildren
} from "react";
import type { AIAssistantItem, AISearchResult } from "@hotel-crm/shared/ai";
import type { AuditLog } from "@hotel-crm/shared/audit";
import type {
  HousekeepingTaskStatus,
  HousekeepingTaskSummary
} from "@hotel-crm/shared/housekeeping";
import type {
  CreateCharge,
  CreatePayment,
  FolioDetails,
  FolioSummary,
  PaymentRecord
} from "@hotel-crm/shared/payments";
import type { ReservationCreate, ReservationSummary } from "@hotel-crm/shared/reservations";
import type { RoomStatus, RoomSummary } from "@hotel-crm/shared/rooms";
import type { StayRecord } from "@hotel-crm/shared/stays";
import type { SyncConflict, SyncQueueItem } from "@hotel-crm/shared/sync";
import { initialAssistantItems } from "../lib/aiFixtures";
import { initialAuditLogs } from "../lib/auditFixtures";
import { loadRemoteSnapshot, resolveSyncConflictRequest } from "../lib/api";
import { initialHousekeepingTasks } from "../lib/housekeepingFixtures";
import { initialFolios, initialPayments } from "../lib/paymentFixtures";
import { initialReservations } from "../lib/reservationFixtures";
import { initialRooms } from "../lib/roomFixtures";
import { initialStays } from "../lib/stayFixtures";
import { initialSyncConflicts, initialSyncQueue } from "../lib/syncFixtures";
import { readSnapshot, writeSnapshot } from "../lib/indexedDb";
import { useAuth } from "./authStore";
import { replaySyncItem, type SyncReplayResult } from "./syncEngine";

type HotelStoreValue = {
  reservations: ReservationSummary[];
  rooms: RoomSummary[];
  housekeepingTasks: HousekeepingTaskSummary[];
  folios: FolioSummary[];
  folioDetails: FolioDetails[];
  payments: PaymentRecord[];
  stays: StayRecord[];
  auditLogs: AuditLog[];
  syncQueue: SyncQueueItem[];
  syncConflicts: SyncConflict[];
  assistantItems: AIAssistantItem[];
  reloadFromRemote: () => Promise<void>;
  retrySyncItemNow: (syncId: string) => void;
  resolveSyncConflict: (conflictId: string) => void;
  createReservation: (input: ReservationCreate) => void;
  confirmReservation: (reservationId: string) => void;
  checkInReservation: (reservationId: string) => void;
  checkOutReservation: (reservationId: string) => void;
  reassignReservationRoom: (reservationId: string, roomId: string) => void;
  updateRoomStatus: (roomId: string, status: RoomStatus) => void;
  getAllowedRoomTransitions: (room: RoomSummary) => RoomStatus[];
  updateHousekeepingTask: (taskId: string, status: HousekeepingTaskStatus) => void;
  addFolioCharge: (input: CreateCharge) => void;
  recordPayment: (input: CreatePayment) => void;
  searchRecords: (query: string) => AISearchResult[];
};

type HotelStoreSnapshot = Pick<
  HotelStoreValue,
  | "reservations"
  | "rooms"
  | "housekeepingTasks"
  | "folios"
  | "folioDetails"
  | "payments"
  | "stays"
  | "auditLogs"
  | "syncQueue"
  | "syncConflicts"
  | "assistantItems"
>;

type SyncFailureStatus = Extract<SyncQueueItem["status"], "failed_retryable" | "failed_conflict">;

const HotelStoreContext = createContext<HotelStoreValue | null>(null);

function localizeSyncText(text: string) {
  return text
    .replace("Reservation for ", "Бронь гостя ")
    .replace(" waiting for upload", " ждёт отправки")
    .replace("Room ", "Номер ")
    .replace(" marked dirty locally", " отмечен как грязный на этом устройстве")
    .replace("Not sent yet", "Ещё не отправлено")
    .replace("Conflict detected 2 min ago", "Конфликт обнаружен 2 минуты назад")
    .replace("Queued locally", "Поставлено в очередь локально")
    .replace("Syncing with API", "Идёт обмен с сервером")
    .replace("Synced with API", "Синхронизировано с сервером")
    .replace("API sync failed", "Не удалось синхронизировать с сервером")
    .replace("Retried successfully", "Повторная отправка прошла успешно")
    .replace("Retry failed, waiting for next backoff", "Повторная отправка не удалась, ждём следующую попытку")
    .replace("Manual retry succeeded", "Повторная отправка выполнена")
    .replace("Manual retry failed", "Повторная отправка не удалась")
    .replace("Conflict acknowledged locally, ready to retry", "Локальное решение принято, можно повторить")
    .replace("Created locally", "Создано на этом устройстве")
    .replace("Confirmed from reservation detail", "Подтверждено из карточки брони")
    .replace("Guest checked in", "Гость заселён")
    .replace("Guest checked out", "Гость выехал")
    .replace("Room assignment synced", "Назначение номера синхронизировано")
    .replace("Room assignment API failed", "Не удалось отправить назначение номера")
    .replace("Confirmed on API", "Подтверждение отправлено")
    .replace("API confirmation failed", "Не удалось подтвердить на сервере")
    .replace("Check-in synced", "Заселение синхронизировано")
    .replace("Check-in rejected by API", "Сервер отклонил заселение")
    .replace("Checkout synced", "Выезд синхронизирован")
    .replace("Checkout rejected by API", "Сервер отклонил выезд")
    .replace("Room status synced", "Статус номера синхронизирован")
    .replace("Room API update failed", "Не удалось обновить номер на сервере")
    .replace("Housekeeping synced", "Изменение по уборке синхронизировано")
    .replace("Housekeeping API update failed", "Не удалось обновить уборку на сервере")
    .replace("Charge synced", "Начисление синхронизировано")
    .replace("Charge API sync failed", "Не удалось отправить начисление")
    .replace("Payment synced", "Оплата синхронизирована")
    .replace("Payment API sync failed", "Не удалось отправить оплату");
}

function normalizeSyncQueueItem(item: SyncQueueItem): SyncQueueItem {
  return {
    ...item,
    summary: localizeSyncText(item.summary),
    lastAttemptLabel: localizeSyncText(item.lastAttemptLabel)
  };
}

function normalizeSyncConflict(conflict: SyncConflict): SyncConflict {
  return {
    ...conflict,
    localSummary: localizeSyncText(conflict.localSummary)
      .replace("Local device says room is dirty after checkout", "На этом устройстве номер ещё грязный после выезда")
      .replace("Check-in attempted before confirmation", "Попытка заселения до подтверждения брони")
      .replace("Check-in attempted without assigned room", "Попытка заселения без назначенного номера")
      .replace("Checkout attempted with balance ", "Попытка выезда при долге ")
      .replace("Attempted to assign room ", "Попытка назначить номер ")
      .replace(" while status is ", ", когда статус номера: ")
      .replace("Attempted to release room ", "Попытка открыть номер ")
      .replace(" while task ", " при активной задаче ")
      .replace(" is still active", ""),
    serverSummary: localizeSyncText(conflict.serverSummary)
      .replace("Server says room is already cleaning by another user", "На сервере уборка уже начата другим сотрудником")
      .replace("Reservation must be confirmed first", "Сначала нужно подтвердить бронь")
      .replace("Reservation needs a room assignment", "Сначала нужно назначить номер")
      .replace("Room is not guest-ready", "Номер ещё не готов к заселению")
      .replace("Outstanding balance blocks safe checkout", "Нельзя оформить выезд, пока есть долг")
      .replace("Room must be ready before assignment", "Номер должен быть готов к назначению")
      .replace("Room cannot become available until housekeeping finishes", "Номер нельзя открыть, пока уборка не завершена"),
    recommendedAction: localizeSyncText(conflict.recommendedAction)
      .replace("Keep server state and re-open cleaning task", "Оставить серверное состояние и заново открыть задачу на уборку")
      .replace("Confirm reservation before check-in", "Сначала подтвердите бронь")
      .replace("Assign a ready room first", "Сначала назначьте готовый номер")
      .replace("Choose another ready room or complete cleaning", "Выберите другой готовый номер или завершите уборку")
      .replace("Collect payment or record manager override before checkout", "Примите оплату или оформите решение управляющего")
      .replace("Choose an available or inspected room", "Выберите свободный или уже проверенный номер")
      .replace("Complete or cancel the housekeeping task first", "Сначала завершите или отмените задачу по уборке")
      .replace("Review the preconditions, resolve the mismatch, then retry.", "Проверьте условия операции, устраните расхождение и повторите")
      .replace("Keep working locally and retry sync when the connection or API issue is resolved.", "Можно продолжать работать локально и повторить синхронизацию позже")
  };
}

function normalizeSyncQueue(items: SyncQueueItem[]) {
  return items.map(normalizeSyncQueueItem);
}

function normalizeSyncConflicts(items: SyncConflict[]) {
  return items.map(normalizeSyncConflict);
}

const roomTransitions: Record<RoomStatus, RoomStatus[]> = {
  available: ["reserved", "dirty", "blocked_maintenance"],
  reserved: ["occupied", "dirty", "blocked_maintenance"],
  occupied: ["dirty"],
  dirty: ["cleaning", "blocked_maintenance"],
  cleaning: ["inspected"],
  inspected: ["available"],
  blocked_maintenance: ["available", "out_of_service"],
  out_of_service: ["dirty", "available"]
};

function getRoomStatusPresentation(status: RoomStatus) {
  switch (status) {
    case "available":
      return {
        housekeepingNote: "Готов к заселению",
        nextAction: "Можно назначать сразу",
        occupancyLabel: "Свободен сегодня"
      };
    case "reserved":
      return {
        housekeepingNote: "Зарезервирован под ближайший заезд",
        nextAction: "Держать готовым для назначенного гостя",
        occupancyLabel: "Ждёт заезд"
      };
    case "occupied":
      return {
        housekeepingNote: "Гость сейчас в номере",
        nextAction: "Ждать выезда перед уборкой",
        occupancyLabel: "Заселён"
      };
    case "dirty":
      return {
        housekeepingNote: "Нужна уборка",
        nextAction: "Отправить в очередь уборки",
        occupancyLabel: "Не готов"
      };
    case "cleaning":
      return {
        housekeepingNote: "Уборка в процессе",
        nextAction: "Дождаться завершения и проверки",
        occupancyLabel: "Убирается"
      };
    case "inspected":
      return {
        housekeepingNote: "Уборка завершена, ждёт выпуска",
        nextAction: "Вернуть номер в продажу",
        occupancyLabel: "Проверен"
      };
    case "blocked_maintenance":
      return {
        housekeepingNote: "Номер заблокирован по техпричине",
        nextAction: "Не продавать до устранения проблемы",
        occupancyLabel: "Недоступен"
      };
    case "out_of_service":
      return {
        housekeepingNote: "Выведен из эксплуатации",
        nextAction: "Нужен ручной возврат в работу",
        occupancyLabel: "Недоступен"
      };
  }
}

function derivePriority(status: RoomStatus, currentPriority: RoomSummary["priority"]) {
  if (status === "blocked_maintenance") {
    return "blocked";
  }

  if (status === "dirty" || status === "cleaning") {
    return currentPriority === "arrival_soon" ? "arrival_soon" : "normal";
  }

  return currentPriority === "blocked" ? "normal" : currentPriority;
}

function derivePaymentStatus(totalAmount: number, paidAmount: number): FolioSummary["status"] {
  if (paidAmount <= 0) {
    return "unpaid";
  }

  if (paidAmount >= totalAmount) {
    return "paid";
  }

  return "partially_paid";
}

function toSearchResults(
  query: string,
  reservations: ReservationSummary[],
  rooms: RoomSummary[]
): AISearchResult[] {
  const normalized = query.trim().toLowerCase();

  const results: AISearchResult[] = [
    ...reservations.map((reservation) => ({
      id: reservation.id,
      entityType: "reservation" as const,
      title: reservation.guestName,
      subtitle: `Бронь с ${reservation.checkInDate} по ${reservation.checkOutDate}`,
      reason: `К оплате ${reservation.balanceDue}, номер ${reservation.roomLabel}`
    })),
    ...rooms.map((room) => ({
      id: room.id,
      entityType: "room" as const,
      title: `Номер ${room.number}`,
      subtitle: `${room.roomType} • ${room.status.replaceAll("_", " ")}`,
      reason: room.nextAction
    }))
  ];

  if (!normalized) {
    return results;
  }

  return results.filter((item) =>
    `${item.title} ${item.subtitle} ${item.reason}`.toLowerCase().includes(normalized)
  );
}

function deriveFolioDetails(folios: FolioSummary[], payments: PaymentRecord[]): FolioDetails[] {
  return folios.map((folio) => ({
    ...folio,
    charges: [],
    payments: payments.filter((payment) => payment.reservationId === folio.reservationId)
  }));
}

function deriveAssistantItems(
  reservations: ReservationSummary[],
  rooms: RoomSummary[],
  housekeepingTasks: HousekeepingTaskSummary[],
  folios: FolioSummary[],
  syncConflicts: SyncConflict[]
): AIAssistantItem[] {
  const items: AIAssistantItem[] = [];
  const activeArrivals = reservations.filter((entry) =>
    ["draft", "confirmed", "pending_confirmation"].includes(entry.status)
  );
  const unpaidArrivals = activeArrivals.filter((entry) => {
    const folio = folios.find((item) => item.reservationId === entry.id);
    return (folio?.balanceDue ?? entry.balanceDue) > 0;
  });
  const dirtyRooms = rooms.filter((entry) => entry.status === "dirty" || entry.status === "cleaning");
  const unassignedConfirmed = reservations.filter(
    (entry) => entry.status === "confirmed" && entry.roomLabel === "UNASSIGNED"
  );

  if (unpaidArrivals.length > 0) {
    items.push({
      id: "ai_daily_unpaid",
      type: "daily_summary",
      title: `Нужно проверить оплату по ${unpaidArrivals.length} заезд${unpaidArrivals.length > 1 ? "ам" : "у"}`,
      detail: unpaidArrivals
        .slice(0, 2)
        .map((entry) => `У гостя ${entry.guestName} остался долг`)
        .join("; "),
      confidence: 0.93,
      actionLabel: "Открыть неоплаченные"
    });
  }

  if (dirtyRooms.length > 0) {
    items.push({
      id: "ai_admin_turnover",
      type: "admin_routine",
      title: `${dirtyRooms.length} номер${dirtyRooms.length > 1 ? "ов требуют" : " требует"} внимания по уборке`,
      detail: `${housekeepingTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length} активных задач ещё блокируют выпуск номеров.`,
      confidence: 0.9,
      actionLabel: "Открыть уборку"
    });
  }

  if (unassignedConfirmed.length > 0) {
    items.push({
      id: "ai_occupancy_pending",
      type: "occupancy_hint",
      title: `${unassignedConfirmed.length} подтверждённ${unassignedConfirmed.length > 1 ? "ые брони ждут" : "ая бронь ждёт"} назначения номера`,
      detail: "Откройте бронь и используйте подсказки ИИ, чтобы плотнее заполнить шахматку.",
      confidence: 0.86,
      actionLabel: "Выбрать номер"
    });
  }

  if (syncConflicts.length > 0) {
    items.push({
      id: "ai_sync_conflicts",
      type: "anomaly",
      title: `${syncConflicts.length} конфликт${syncConflicts.length > 1 ? "а" : ""} синхронизации требуют проверки`,
      detail: "Разберите конфликты, пока они не превратились в расхождения по номерам и оплатам.",
      confidence: 0.88,
      actionLabel: "Разобрать конфликты"
    });
  }

  return items;
}

export function HotelStoreProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [reservations, setReservations] = useState(initialReservations);
  const [rooms, setRooms] = useState(initialRooms);
  const [housekeepingTasks, setHousekeepingTasks] = useState(initialHousekeepingTasks);
  const [folios, setFolios] = useState(initialFolios);
  const [folioDetails, setFolioDetails] = useState<FolioDetails[]>(
    deriveFolioDetails(initialFolios, initialPayments)
  );
  const [payments, setPayments] = useState(initialPayments);
  const [stays, setStays] = useState(initialStays);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [syncQueue, setSyncQueue] = useState(normalizeSyncQueue(initialSyncQueue));
  const [syncConflicts, setSyncConflicts] = useState(normalizeSyncConflicts(initialSyncConflicts));
  const [assistantItems, setAssistantItems] = useState(initialAssistantItems);

  async function reloadFromRemote() {
    const snapshot = await loadRemoteSnapshot();
    setReservations(snapshot.reservations);
    setRooms(snapshot.rooms);
    setHousekeepingTasks(snapshot.housekeepingTasks);
    setPayments(snapshot.payments);
    setFolios(snapshot.folios);
    setFolioDetails(
      snapshot.folioDetails.length > 0
        ? snapshot.folioDetails
        : deriveFolioDetails(snapshot.folios, snapshot.payments)
    );
    setStays(snapshot.stays);
    setAuditLogs(snapshot.auditLogs);
    setSyncConflicts(normalizeSyncConflicts(snapshot.syncConflicts));
    setAssistantItems(snapshot.assistantItems);
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    reloadFromRemote()
      .catch(() => {
        // Local state remains the fallback when API is unavailable.
      });
  }, [session]);

  useEffect(() => {
    readSnapshot<HotelStoreSnapshot>()
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }

        setReservations(snapshot.reservations);
        setRooms(snapshot.rooms);
        setHousekeepingTasks(snapshot.housekeepingTasks);
        setFolios(snapshot.folios);
        setFolioDetails(snapshot.folioDetails ?? deriveFolioDetails(snapshot.folios, snapshot.payments));
        setPayments(snapshot.payments);
        setStays(snapshot.stays);
        setAuditLogs(snapshot.auditLogs);
        setSyncQueue(normalizeSyncQueue(snapshot.syncQueue));
        setSyncConflicts(normalizeSyncConflicts(snapshot.syncConflicts));
        setAssistantItems(snapshot.assistantItems);
      })
      .catch(() => {
        // Keep defaults if IndexedDB is unavailable.
      });
  }, []);

  useEffect(() => {
    void writeSnapshot({
      reservations,
      rooms,
      housekeepingTasks,
      folios,
      folioDetails,
      payments,
      stays,
      auditLogs,
      syncQueue,
      syncConflicts,
      assistantItems
    }).catch(() => {
      // Persistence is best-effort in the scaffold phase.
    });
  }, [assistantItems, auditLogs, folioDetails, folios, housekeepingTasks, payments, reservations, rooms, stays, syncConflicts, syncQueue]);

  useEffect(() => {
    setAssistantItems(
      deriveAssistantItems(reservations, rooms, housekeepingTasks, folios, syncConflicts)
    );
  }, [folios, housekeepingTasks, reservations, rooms, syncConflicts]);

  useEffect(() => {
    const retryableItem = syncQueue.find((item) => item.status === "failed_retryable");
    if (!retryableItem) {
      return;
    }

    const timeoutMs = Math.min(2000 * 2 ** retryableItem.retryCount, 15000);
    const timeout = window.setTimeout(() => {
      void syncNow(retryableItem, {
        successLabel: "Повторная отправка прошла успешно",
        failureLabel: "Повторная отправка не удалась, ждём следующую попытку",
        failureStatus: "failed_retryable",
        nextRetryCount: retryableItem.retryCount + 1,
        createConflictOnFailure: false
      });
    }, timeoutMs);

    return () => window.clearTimeout(timeout);
  }, [syncQueue]);

  function enqueueSyncItem(item: Omit<SyncQueueItem, "id">) {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextItem = { id: syncId, ...item };
    const normalized = normalizeSyncQueueItem(nextItem);
    setSyncQueue((current) => [normalized, ...current]);
    return normalized;
  }

  function updateSyncItem(syncId: string, patch: Partial<SyncQueueItem>) {
    setSyncQueue((current) =>
      current.map((item) => (item.id === syncId ? { ...item, ...patch } : item))
    );
  }

  function appendAuditLog(input: Omit<AuditLog, "id" | "createdAt">) {
    setAuditLogs((current) => [
      {
        id: `audit_${Date.now()}_${current.length + 1}`,
        createdAt: new Date().toISOString(),
        ...input
      },
      ...current
    ]);
  }

  function upsertConflict(conflict: Omit<SyncConflict, "id">) {
    setSyncConflicts((current) => {
      const existing = current.find(
        (entry) =>
          entry.entityType === conflict.entityType && entry.entityId === conflict.entityId
      );

      if (!existing) {
        return [
          normalizeSyncConflict({
            id: `conflict_${Date.now()}_${current.length + 1}`,
            ...conflict
          }),
          ...current
        ];
      }

      return current.map((entry) =>
        entry.id === existing.id ? normalizeSyncConflict({ ...entry, ...conflict }) : entry
      );
    });
  }

  function clearConflictsForEntity(entityType: SyncConflict["entityType"], entityId: string) {
    setSyncConflicts((current) =>
      current.filter((entry) => !(entry.entityType === entityType && entry.entityId === entityId))
    );
  }

  function applyRemoteSyncResult(item: SyncQueueItem, result: SyncReplayResult) {
    switch (item.action) {
      case "create_reservation":
      case "confirm_reservation":
      case "reassign_room":
      case "check_in":
      case "check_out":
        if (result) {
          const remoteReservation = result as ReservationSummary;
          setReservations((current) =>
            current.map((entry) =>
              entry.id === remoteReservation.id ? remoteReservation : entry
            )
          );
        }
        break;
      case "update_room_status":
        if (result) {
          const remoteRoom = result as RoomSummary;
          setRooms((current) =>
            current.map((entry) => (entry.id === remoteRoom.id ? remoteRoom : entry))
          );
        }
        break;
      case "update_housekeeping":
        if (result) {
          const remoteTask = result as HousekeepingTaskSummary;
          setHousekeepingTasks((current) =>
            current.map((entry) => (entry.id === remoteTask.id ? remoteTask : entry))
          );
        }
        break;
      case "record_payment":
        if (result) {
          const remotePayment = result as { payment: PaymentRecord; folio: FolioDetails };
          setFolios((current) =>
            current.map((folio) =>
              folio.reservationId === remotePayment.folio.reservationId
                ? {
                    reservationId: remotePayment.folio.reservationId,
                    guestName: remotePayment.folio.guestName,
                    totalAmount: remotePayment.folio.totalAmount,
                    paidAmount: remotePayment.folio.paidAmount,
                    balanceDue: remotePayment.folio.balanceDue,
                    status: remotePayment.folio.status
                  }
                : folio
            )
          );
          setPayments((current) =>
            current.map((entry) =>
              entry.id === remotePayment.payment.id ? remotePayment.payment : entry
            )
          );
          setFolioDetails((current) =>
            current.map((folio) =>
              folio.reservationId === remotePayment.folio.reservationId
                ? remotePayment.folio
                : folio
            )
          );
        }
        break;
      case "create_charge":
        if (result) {
          const remoteCharge = result as { charge: import("@hotel-crm/shared/payments").FolioCharge; folio: FolioDetails };
          setFolios((current) =>
            current.map((folio) =>
              folio.reservationId === remoteCharge.folio.reservationId
                ? {
                    reservationId: remoteCharge.folio.reservationId,
                    guestName: remoteCharge.folio.guestName,
                    totalAmount: remoteCharge.folio.totalAmount,
                    paidAmount: remoteCharge.folio.paidAmount,
                    balanceDue: remoteCharge.folio.balanceDue,
                    status: remoteCharge.folio.status
                  }
                : folio
            )
          );
          setFolioDetails((current) =>
            current.map((folio) =>
              folio.reservationId === remoteCharge.folio.reservationId ? remoteCharge.folio : folio
            )
          );
        }
        break;
      default:
        break;
    }
  }

  function syncFailureStatusFor(item: SyncQueueItem): SyncFailureStatus {
    return item.action === "check_in" || item.action === "check_out"
      ? "failed_conflict"
      : "failed_retryable";
  }

  async function syncNow(
    item: SyncQueueItem,
    options: {
      successLabel: string;
      failureLabel: string;
      failureStatus?: SyncFailureStatus;
      nextRetryCount?: number;
      createConflictOnFailure?: boolean;
      onFailure?: (error: Error) => void;
    }
  ) {
    updateSyncItem(item.id, {
      status: "syncing",
      lastAttemptLabel: "Идёт обмен с сервером"
    });

    try {
      const result = await replaySyncItem(item);
      applyRemoteSyncResult(item, result);
      clearConflictsForEntity(item.entityType, item.entityId);
      updateSyncItem(item.id, {
        status: "synced",
        lastAttemptLabel: options.successLabel
      });
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const failureStatus = options.failureStatus ?? syncFailureStatusFor(item);

      updateSyncItem(item.id, {
        status: failureStatus,
        retryCount: options.nextRetryCount ?? item.retryCount,
        lastAttemptLabel: options.failureLabel
      });

      if (options.createConflictOnFailure !== false) {
        upsertConflict({
          entityType: item.entityType,
          entityId: item.entityId,
          localSummary: item.summary,
          serverSummary: error.message,
          recommendedAction:
            failureStatus === "failed_conflict"
              ? "Проверьте условия операции, устраните расхождение и повторите."
              : "Можно продолжать работать локально и повторить синхронизацию позже."
        });
      }

      options.onFailure?.(error);
    }
  }

  function createReservation(input: ReservationCreate) {
    const reservationId = `resv_${input.idempotencyKey}`;
    const reservation: ReservationSummary = {
      id: reservationId,
      guestName: input.guestName,
      roomLabel: "UNASSIGNED",
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      status: "draft",
      balanceDue: input.totalAmount
    };

    setReservations((current) => [reservation, ...current]);
    setFolios((current) => [
      {
        reservationId: reservation.id,
        guestName: input.guestName,
        totalAmount: input.totalAmount,
        paidAmount: 0,
        balanceDue: input.totalAmount,
        status: input.totalAmount > 0 ? "unpaid" : "paid"
      },
      ...current
    ]);

    const syncItem = enqueueSyncItem({
      entityType: "reservation",
      entityId: reservation.id,
      operation: "create",
      action: "create_reservation",
      payloadJson: JSON.stringify(input),
      localVersion: 1,
      status: "queued",
      summary: `Бронь ${input.guestName} ждёт отправки`,
      lastAttemptLabel: "Поставлено в очередь локально",
      retryCount: 0
    });
    appendAuditLog({
      entityType: "reservation",
      entityId: reservation.id,
      action: "reservation_created",
      reason: "Создано на этом устройстве"
    });

    void syncNow(syncItem, {
      successLabel: "Синхронизировано с сервером",
      failureLabel: "Не удалось синхронизировать с сервером"
    });
  }

  function confirmReservation(reservationId: string) {
    const reservation = reservations.find((entry) => entry.id === reservationId);
    if (!reservation || !["draft", "pending_confirmation"].includes(reservation.status)) {
      return;
    }

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, status: "confirmed" } : reservation
      )
    );
    appendAuditLog({
      entityType: "reservation",
      entityId: reservationId,
      action: "reservation_confirmed",
      reason: "Подтверждено из карточки брони"
    });
    const syncItem = enqueueSyncItem({
      entityType: "reservation",
      entityId: reservationId,
      operation: "update",
      action: "confirm_reservation",
      payloadJson: JSON.stringify({ reservationId }),
      localVersion: 1,
      status: "queued",
      summary: `Бронь ${reservationId} подтверждена`,
      lastAttemptLabel: "Поставлено в очередь локально",
      retryCount: 0
    });

    void syncNow(syncItem, {
      successLabel: "Подтверждение отправлено",
      failureLabel: "Не удалось подтвердить на сервере"
    });
  }

  function reassignReservationRoom(reservationId: string, roomId: string) {
    const room = rooms.find((entry) => entry.id === roomId);
    if (!room) {
      return;
    }
    if (!["available", "reserved", "inspected"].includes(room.status)) {
      upsertConflict({
        entityType: "room",
        entityId: roomId,
        localSummary: `Попытка назначить номер ${room.number}, когда он ещё не готов`,
        serverSummary: "Номер должен быть готов к назначению",
        recommendedAction: "Выберите свободный или уже проверенный номер"
      });
      return;
    }

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, roomLabel: room.number } : reservation
      )
    );
    updateRoomStatus(roomId, "reserved");
    const syncItem = enqueueSyncItem({
      entityType: "reservation",
      entityId: reservationId,
      operation: "update",
      action: "reassign_room",
      payloadJson: JSON.stringify({ reservationId, roomLabel: room.number }),
      localVersion: 1,
      status: "queued",
      summary: `Номер назначен для брони ${reservationId}`,
      lastAttemptLabel: "Поставлено в очередь локально",
      retryCount: 0
    });
    appendAuditLog({
      entityType: "reservation",
      entityId: reservationId,
      action: "room_reassigned",
      reason: `Assigned room ${room.number}`
    });

    void syncNow(syncItem, {
      successLabel: "Назначение номера синхронизировано",
      failureLabel: "Не удалось отправить назначение номера"
    });
  }

  function checkInReservation(reservationId: string) {
    const reservation = reservations.find((entry) => entry.id === reservationId);
    if (!reservation) {
      return;
    }
    if (reservation.status !== "confirmed") {
      upsertConflict({
        entityType: "reservation",
        entityId: reservationId,
        localSummary: "Check-in attempted before confirmation",
        serverSummary: "Reservation must be confirmed first",
        recommendedAction: "Confirm reservation before check-in"
      });
      return;
    }
    if (reservation.roomLabel === "UNASSIGNED") {
      upsertConflict({
        entityType: "reservation",
        entityId: reservationId,
        localSummary: "Check-in attempted without assigned room",
        serverSummary: "Reservation needs a room assignment",
        recommendedAction: "Assign a ready room first"
      });
      return;
    }

    const room = rooms.find((entry) => entry.number === reservation.roomLabel);
    if (!room || !["available", "reserved", "inspected"].includes(room.status)) {
      upsertConflict({
        entityType: "room",
        entityId: room?.id ?? reservation.roomLabel,
        localSummary: `Check-in attempted into room ${reservation.roomLabel}`,
        serverSummary: "Room is not guest-ready",
        recommendedAction: "Choose another ready room or complete cleaning"
      });
      return;
    }

    setReservations((current) =>
      current.map((entry) =>
        entry.id === reservationId ? { ...entry, status: "checked_in" } : entry
      )
    );
    setStays((current) => [
      {
        id: `stay_${Date.now()}`,
        reservationId,
        roomId: room.id,
        roomLabel: room.number,
        guestName: reservation.guestName,
        status: "active",
        checkedInAt: new Date().toISOString(),
        checkedOutAt: null
      },
      ...current
    ]);
    updateRoomStatus(room.id, "occupied");
    appendAuditLog({
      entityType: "stay",
      entityId: reservationId,
      action: "checked_in",
      reason: "Guest checked in"
    });
    const syncItem = enqueueSyncItem({
      entityType: "reservation",
      entityId: reservationId,
      operation: "update",
      action: "check_in",
      payloadJson: JSON.stringify({ reservationId }),
      localVersion: 1,
      status: "queued",
      summary: `Check-in recorded for ${reservation.guestName}`,
      lastAttemptLabel: "Queued locally",
      retryCount: 0
    });

    void syncNow(syncItem, {
      successLabel: "Check-in synced",
      failureLabel: "Check-in rejected by API",
      failureStatus: "failed_conflict"
    });
  }

  function checkOutReservation(reservationId: string) {
    const reservation = reservations.find((entry) => entry.id === reservationId);
    const folio = folios.find((entry) => entry.reservationId === reservationId);
    const activeStay = stays.find((entry) => entry.reservationId === reservationId && entry.status === "active");

    if (!reservation || !activeStay) {
      return;
    }

    if ((folio?.balanceDue ?? 0) > 0) {
      upsertConflict({
        entityType: "payment",
        entityId: reservationId,
        localSummary: `Checkout attempted with balance ${folio?.balanceDue ?? 0}`,
        serverSummary: "Outstanding balance blocks safe checkout",
        recommendedAction: "Collect payment or record manager override before checkout"
      });
      return;
    }

    setReservations((current) =>
      current.map((entry) =>
        entry.id === reservationId ? { ...entry, status: "checked_out" } : entry
      )
    );
    setStays((current) =>
      current.map((entry) =>
        entry.id === activeStay.id
          ? { ...entry, status: "checked_out", checkedOutAt: new Date().toISOString() }
          : entry
      )
    );
    setRooms((current) =>
      current.map((room) =>
        room.id === activeStay.roomId
          ? {
              ...room,
              status: "dirty",
              housekeepingNote: "Requires cleaning",
              nextAction: "Send to housekeeping queue",
              occupancyLabel: "Not ready"
            }
          : room
      )
    );
    setHousekeepingTasks((current) => {
      const exists = current.some(
        (task) =>
          task.roomId === activeStay.roomId &&
          task.status !== "completed" &&
          task.status !== "cancelled"
      );
      if (exists) {
        return current;
      }

      return [
        {
          id: `task_${activeStay.roomId}_${Date.now()}`,
          roomId: activeStay.roomId,
          roomNumber: activeStay.roomLabel,
          priority: "urgent",
          status: "queued",
          taskType: "checkout_clean",
          note: "Auto-created from checkout",
          dueLabel: "Clean before next arrival"
        },
        ...current
      ];
    });
    appendAuditLog({
      entityType: "stay",
      entityId: reservationId,
      action: "checked_out",
      reason: "Guest checked out"
    });
    const syncItem = enqueueSyncItem({
      entityType: "reservation",
      entityId: reservationId,
      operation: "update",
      action: "check_out",
      payloadJson: JSON.stringify({ reservationId }),
      localVersion: 1,
      status: "queued",
      summary: `Checkout recorded for ${reservation.guestName}`,
      lastAttemptLabel: "Queued locally",
      retryCount: 0
    });

    void syncNow(syncItem, {
      successLabel: "Checkout synced",
      failureLabel: "Checkout rejected by API",
      failureStatus: "failed_conflict"
    });
  }

  function getAllowedRoomTransitions(room: RoomSummary) {
    const transitions = roomTransitions[room.status];
    const activeTask = housekeepingTasks.find(
      (task) => task.roomId === room.id && task.status !== "completed" && task.status !== "cancelled"
    );

    if (!activeTask) {
      return transitions;
    }

    return transitions.filter((status) => status !== "available");
  }

  function updateRoomStatus(roomId: string, status: RoomStatus) {
    const room = rooms.find((entry) => entry.id === roomId);
    if (!room) {
      return;
    }

    const activeTask = housekeepingTasks.find(
      (task) => task.roomId === roomId && task.status !== "completed" && task.status !== "cancelled"
    );

    if (status === "available" && activeTask) {
      upsertConflict({
        entityType: "room",
        entityId: roomId,
        localSummary: `Attempted to release room ${room.number} while task ${activeTask.id} is still active`,
        serverSummary: "Room cannot become available until housekeeping finishes",
        recommendedAction: "Complete or cancel the housekeeping task first"
      });
      return;
    }

    const presentation = getRoomStatusPresentation(status);
    setRooms((current) =>
      current.map((entry) =>
        entry.id === roomId
          ? {
              ...entry,
              status,
              housekeepingNote: presentation.housekeepingNote,
              nextAction: presentation.nextAction,
              occupancyLabel: presentation.occupancyLabel,
              priority: derivePriority(status, entry.priority)
            }
          : entry
      )
    );

    setHousekeepingTasks((current) => {
      const roomTasks = current.filter((task) => task.roomId === roomId);
      const activeRoomTask = roomTasks.find(
        (task) => task.status !== "completed" && task.status !== "cancelled"
      );

      if (status === "dirty" && !activeRoomTask) {
        return [
          {
            id: `task_${roomId}_${Date.now()}`,
            roomId,
            roomNumber: room.number,
            priority: room.priority === "arrival_soon" ? "urgent" : "normal",
            status: "queued",
            taskType: "manual_clean",
            note: "Created from room status change",
            dueLabel: "Queue now"
          },
          ...current
        ];
      }

      return current.map((task) => {
        if (task.roomId !== roomId || task.status === "completed" || task.status === "cancelled") {
          return task;
        }

        if (status === "cleaning") {
          return { ...task, status: "in_progress", dueLabel: "Cleaning now" };
        }

        if (status === "inspected") {
          return { ...task, status: "completed", dueLabel: "Done" };
        }

        return task;
      });
    });

    const syncItem = enqueueSyncItem({
      entityType: "room",
      entityId: roomId,
      operation: "update",
      action: "update_room_status",
      payloadJson: JSON.stringify({ roomId, status }),
      localVersion: 1,
      status: "queued",
      summary: `Room ${room.number} changed to ${status.replaceAll("_", " ")}`,
      lastAttemptLabel: "Queued locally",
      retryCount: 0
    });
    appendAuditLog({
      entityType: "room",
      entityId: roomId,
      action: "room_status_changed",
      reason: `Room moved to ${status.replaceAll("_", " ")}`
    });

    void syncNow(syncItem, {
      successLabel: "Room status synced",
      failureLabel: "Room API update failed"
    });
  }

  function updateHousekeepingTask(taskId: string, status: HousekeepingTaskStatus) {
    const task = housekeepingTasks.find((entry) => entry.id === taskId);
    if (!task) {
      return;
    }

    setHousekeepingTasks((current) =>
      current.map((entry) =>
        entry.id === taskId
          ? {
              ...entry,
              status,
              dueLabel: status === "completed" ? "Done" : status === "in_progress" ? "Cleaning now" : entry.dueLabel
            }
          : entry
      )
    );

    const roomStatusMap: Record<HousekeepingTaskStatus, RoomStatus | null> = {
      queued: "dirty",
      in_progress: "cleaning",
      completed: "inspected",
      cancelled: "dirty"
    };

    const nextRoomStatus = roomStatusMap[status];
    if (nextRoomStatus) {
      const presentation = getRoomStatusPresentation(nextRoomStatus);
      setRooms((current) =>
        current.map((room) =>
          room.id === task.roomId
            ? {
                ...room,
                status: nextRoomStatus,
                housekeepingNote: presentation.housekeepingNote,
                nextAction: presentation.nextAction,
                occupancyLabel: presentation.occupancyLabel
              }
            : room
        )
      );
    }

    const syncItem = enqueueSyncItem({
      entityType: "housekeeping_task",
      entityId: taskId,
      operation: "update",
      action: "update_housekeeping",
      payloadJson: JSON.stringify({ taskId, status }),
      localVersion: 1,
      status: "queued",
      summary: `Housekeeping task for room ${task.roomNumber} changed to ${status.replaceAll("_", " ")}`,
      lastAttemptLabel: "Queued locally",
      retryCount: 0
    });
    appendAuditLog({
      entityType: "room",
      entityId: task.roomId,
      action: "housekeeping_updated",
      reason: `Housekeeping moved to ${status.replaceAll("_", " ")}`
    });

    void syncNow(syncItem, {
      successLabel: "Housekeeping synced",
      failureLabel: "Housekeeping API update failed"
    });
  }

  function addFolioCharge(input: CreateCharge) {
    const charge = {
      id: `charge_${input.idempotencyKey}`,
      reservationId: input.reservationId,
      guestName: input.guestName,
      type: input.type,
      description: input.description,
      amount: input.amount,
      postedAt: new Date().toISOString()
    };

    setFolios((current) => {
      const existing = current.find((folio) => folio.reservationId === input.reservationId);
      if (!existing) {
        return [
          {
            reservationId: input.reservationId,
            guestName: input.guestName,
            totalAmount: input.amount,
            paidAmount: 0,
            balanceDue: input.amount,
            status: "unpaid"
          },
          ...current
        ];
      }

      return current.map((folio) =>
        folio.reservationId === input.reservationId
          ? {
              ...folio,
              guestName: input.guestName,
              totalAmount: folio.totalAmount + input.amount,
              balanceDue: folio.balanceDue + input.amount,
              status: derivePaymentStatus(folio.totalAmount + input.amount, folio.paidAmount)
            }
          : folio
      );
    });

    setFolioDetails((current) => {
      const existing = current.find((folio) => folio.reservationId === input.reservationId);
      if (!existing) {
        return [
          {
            reservationId: input.reservationId,
            guestName: input.guestName,
            totalAmount: input.amount,
            paidAmount: 0,
            balanceDue: input.amount,
            status: "unpaid",
            charges: [charge],
            payments: []
          },
          ...current
        ];
      }

      return current.map((folio) =>
        folio.reservationId === input.reservationId
          ? {
              ...folio,
              guestName: input.guestName,
              totalAmount: folio.totalAmount + input.amount,
              balanceDue: folio.balanceDue + input.amount,
              status: derivePaymentStatus(folio.totalAmount + input.amount, folio.paidAmount),
              charges: [charge, ...folio.charges]
            }
          : folio
      );
    });

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === input.reservationId
          ? {
              ...reservation,
              balanceDue: reservation.balanceDue + input.amount
            }
          : reservation
      )
    );

    const syncItem = enqueueSyncItem({
      entityType: "payment",
      entityId: charge.id,
      operation: "create",
      action: "create_charge",
      payloadJson: JSON.stringify(input),
      localVersion: 1,
      status: "queued",
      summary: `${input.type.replaceAll("_", " ")} charge posted for ${input.guestName}`,
      lastAttemptLabel: "Queued locally",
      retryCount: 0
    });
    appendAuditLog({
      entityType: "payment",
      entityId: charge.id,
      action: "charge_posted",
      reason: `${input.description} added to folio`
    });

    void syncNow(syncItem, {
      successLabel: "Charge synced",
      failureLabel: "Charge API sync failed"
    });
  }

  function recordPayment(input: CreatePayment) {
    const payment: PaymentRecord = {
      id: `pay_${input.idempotencyKey}`,
      reservationId: input.reservationId,
      guestName: input.guestName,
      amount: input.amount,
      method: input.method,
      receivedAt: new Date().toISOString(),
      note: input.note
    };

    setPayments((current) => [payment, ...current]);

    setFolios((current) => {
      const existing = current.find((folio) => folio.reservationId === input.reservationId);
      if (!existing) {
        return [
          {
            reservationId: input.reservationId,
            guestName: input.guestName,
            totalAmount: input.amount,
            paidAmount: input.amount,
            balanceDue: 0,
            status: "paid"
          },
          ...current
        ];
      }

      return current.map((folio) => {
        if (folio.reservationId !== input.reservationId) {
          return folio;
        }

        const paidAmount = folio.paidAmount + input.amount;
        return {
          ...folio,
          guestName: input.guestName,
          paidAmount,
          balanceDue: Math.max(folio.totalAmount - paidAmount, 0),
          status: derivePaymentStatus(folio.totalAmount, paidAmount)
        };
      });
    });

    setFolioDetails((current) => {
      const existing = current.find((folio) => folio.reservationId === input.reservationId);
      if (!existing) {
        return [
          {
            reservationId: input.reservationId,
            guestName: input.guestName,
            totalAmount: input.amount,
            paidAmount: input.amount,
            balanceDue: 0,
            status: "paid",
            charges: [],
            payments: [payment]
          },
          ...current
        ];
      }

      return current.map((folio) => {
        if (folio.reservationId !== input.reservationId) {
          return folio;
        }

        const paidAmount = folio.paidAmount + input.amount;
        return {
          ...folio,
          guestName: input.guestName,
          paidAmount,
          balanceDue: Math.max(folio.totalAmount - paidAmount, 0),
          status: derivePaymentStatus(folio.totalAmount, paidAmount),
          payments: [payment, ...folio.payments]
        };
      });
    });

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === input.reservationId
          ? {
              ...reservation,
              balanceDue: Math.max(reservation.balanceDue - input.amount, 0)
            }
          : reservation
      )
    );

    setAssistantItems((current) =>
      current.map((item) =>
        item.id === "ai_daily_1"
          ? {
              ...item,
              detail: "Review the updated unpaid arrivals list after the new payment."
            }
          : item
      )
    );

    const syncItem = enqueueSyncItem({
      entityType: "payment",
      entityId: payment.id,
      operation: "create",
      action: "record_payment",
      payloadJson: JSON.stringify(input),
      localVersion: 1,
      status: "queued",
      summary: `Payment recorded for ${input.guestName}`,
      lastAttemptLabel: "Queued locally",
      retryCount: 0
    });
    appendAuditLog({
      entityType: "payment",
      entityId: payment.id,
      action: "payment_recorded",
      reason: `Payment of ${input.amount} recorded for ${input.guestName}`
    });

    void syncNow(syncItem, {
      successLabel: "Payment synced",
      failureLabel: "Payment API sync failed"
    });
  }

  function retrySyncItemNow(syncId: string) {
    const item = syncQueue.find((entry) => entry.id === syncId);
    if (!item || item.status === "syncing" || item.status === "synced") {
      return;
    }

    void syncNow(item, {
      successLabel: "Manual retry succeeded",
      failureLabel: "Manual retry failed",
      failureStatus: syncFailureStatusFor(item),
      nextRetryCount: item.retryCount + 1
    });
  }

  function resolveSyncConflict(conflictId: string) {
    const conflict = syncConflicts.find((entry) => entry.id === conflictId);
    if (!conflict) {
      return;
    }

    setSyncConflicts((current) => current.filter((entry) => entry.id !== conflictId));
    setSyncQueue((current) =>
      current.map((item) =>
        item.entityType === conflict.entityType &&
        item.entityId === conflict.entityId &&
        item.status === "failed_conflict"
          ? {
              ...item,
              status: "failed_retryable",
              lastAttemptLabel: "Conflict acknowledged locally, ready to retry"
            }
          : item
      )
    );

    void resolveSyncConflictRequest(conflictId).catch(() => {
      // Local resolution stays primary if the server is unreachable.
    });
  }

  return (
    <HotelStoreContext.Provider
      value={{
        reservations,
        rooms,
        housekeepingTasks,
        folios,
        folioDetails,
        payments,
        stays,
        auditLogs,
        syncQueue,
        syncConflicts,
        assistantItems,
        reloadFromRemote,
        retrySyncItemNow,
        resolveSyncConflict,
        createReservation,
        confirmReservation,
        checkInReservation,
        checkOutReservation,
        reassignReservationRoom,
        updateRoomStatus,
        getAllowedRoomTransitions,
        updateHousekeepingTask,
        addFolioCharge,
        recordPayment,
        searchRecords: (query) => toSearchResults(query, reservations, rooms)
      }}
    >
      {children}
    </HotelStoreContext.Provider>
  );
}

export function useHotelStore() {
  const context = useContext(HotelStoreContext);
  if (!context) {
    throw new Error("useHotelStore must be used inside HotelStoreProvider");
  }

  return context;
}
