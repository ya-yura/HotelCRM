import type { AIAssistantItem } from "@hotel-crm/shared/ai";
import type { AzAccessRole, HotelRole } from "@hotel-crm/shared/auth";
import type { HousekeepingTaskStatus } from "@hotel-crm/shared/housekeeping";
import type { MaintenancePriority, MaintenanceStatus } from "@hotel-crm/shared/maintenance";
import type {
  CreateCharge,
  CreatePayment,
  FiscalReceiptStatus,
  FolioSummary,
  PaymentLink,
  PaymentRecord
} from "@hotel-crm/shared/payments";
import type { PropertyType, PropertyVatRate } from "@hotel-crm/shared/properties";
import type { ReservationCreate, ReservationSummary } from "@hotel-crm/shared/reservations";
import type { RoomStatus, RoomSummary } from "@hotel-crm/shared/rooms";
import type { SyncConflict, SyncQueueItem } from "@hotel-crm/shared/sync";

export function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  });
}

export function roleLabel(role?: HotelRole | null) {
  switch (role) {
    case "owner":
      return "Владелец";
    case "manager":
      return "Управляющий";
    case "frontdesk":
      return "Администратор";
    case "housekeeping":
      return "Уборка";
    case "maintenance":
      return "Техслужба";
    case "accountant":
      return "Бухгалтер";
    default:
      return "Не указано";
  }
}

export function azAccessRoleLabel(role?: AzAccessRole | null) {
  switch (role) {
    case "admin":
      return "Админ";
    case "staff":
      return "Сотрудник";
    default:
      return "Не указано";
  }
}

export function reservationStatusLabel(status: ReservationSummary["status"]) {
  switch (status) {
    case "inquiry":
      return "Запрос";
    case "draft":
      return "Черновик";
    case "pending_confirmation":
      return "Ждёт подтверждения";
    case "confirmed":
      return "Подтверждено";
    case "checked_in":
      return "Гость заселён";
    case "checked_out":
      return "Гость выехал";
    case "cancelled":
      return "Отменено";
    case "no_show":
      return "Незаезд";
  }
}

export function roomStatusLabel(status: RoomStatus) {
  switch (status) {
    case "available":
      return "Готов";
    case "reserved":
      return "Закреплён";
    case "occupied":
      return "Заселён";
    case "dirty":
      return "Грязный";
    case "cleaning":
      return "Убирается";
    case "inspected":
      return "Проверен";
    case "blocked_maintenance":
      return "Заблокирован";
    case "out_of_service":
      return "Выведен из продажи";
  }
}

export function housekeepingStatusLabel(status: HousekeepingTaskStatus) {
  switch (status) {
    case "queued":
      return "В очереди";
    case "in_progress":
      return "В работе";
    case "paused":
      return "Пауза";
    case "inspection_requested":
      return "Нужна проверка";
    case "problem_reported":
      return "Есть проблема";
    case "completed":
      return "Завершено";
    case "cancelled":
      return "Отменено";
  }
}

export function maintenanceStatusLabel(status: MaintenanceStatus) {
  switch (status) {
    case "open":
      return "Открыта";
    case "in_progress":
      return "В работе";
    case "resolved":
      return "Решена";
    case "cancelled":
      return "Отменена";
  }
}

export function maintenancePriorityLabel(priority: MaintenancePriority) {
  switch (priority) {
    case "low":
      return "Низкий";
    case "normal":
      return "Обычный";
    case "high":
      return "Высокий";
    case "critical":
      return "Критичный";
  }
}

export function folioStatusLabel(status: FolioSummary["status"]) {
  switch (status) {
    case "unpaid":
      return "Не оплачено";
    case "partially_paid":
      return "Оплачено частично";
    case "paid":
      return "Оплачено";
  }
}

export function chargeTypeLabel(type: CreateCharge["type"]) {
  switch (type) {
    case "room":
      return "Проживание";
    case "service":
      return "Услуга";
    case "breakfast":
      return "Завтрак";
    case "parking":
      return "Парковка";
    case "laundry":
      return "Прачечная";
    case "minibar":
      return "Мини-бар";
    case "damage":
      return "Порча имущества";
    case "tax_fee":
      return "Сбор / налог";
    case "discount":
      return "Скидка";
    case "correction":
      return "Корректировка";
    case "other":
      return "Другое";
  }
}

export function paymentMethodLabel(method: CreatePayment["method"]) {
  switch (method) {
    case "cash":
      return "Наличные";
    case "card":
      return "Карта";
    case "bank_transfer":
      return "Перевод";
    case "sbp":
      return "СБП";
    case "yookassa":
      return "ЮKassa";
    case "tbank":
      return "T-Bank";
  }
}

export function paymentKindLabel(kind: PaymentRecord["kind"]) {
  switch (kind) {
    case "payment":
      return "Оплата";
    case "deposit":
      return "Депозит";
    case "refund":
      return "Возврат";
    case "void":
      return "Сторно";
  }
}

export function fiscalStatusLabel(status: FiscalReceiptStatus) {
  switch (status) {
    case "not_required":
      return "Не требуется";
    case "pending":
      return "Ожидает отправки";
    case "sent":
      return "Отправлен";
    case "acknowledged":
      return "Подтвержден";
    case "failed":
      return "Ошибка";
  }
}

export function paymentLinkStatusLabel(status: PaymentLink["status"]) {
  switch (status) {
    case "draft":
      return "Черновик";
    case "sent":
      return "Отправлена";
    case "paid":
      return "Оплачена";
    case "expired":
      return "Истекла";
    case "cancelled":
      return "Отменена";
  }
}

export function reservationSourceLabel(source: ReservationCreate["source"]) {
  switch (source) {
    case "phone":
      return "Телефон";
    case "walk_in":
      return "С улицы";
    case "whatsapp":
      return "WhatsApp";
    case "ota":
      return "Агрегатор";
    case "manual":
      return "Вручную";
  }
}

export function aiTypeLabel(type: AIAssistantItem["type"]) {
  switch (type) {
    case "daily_summary":
      return "Сводка дня";
    case "anomaly":
      return "Проблема";
    case "admin_routine":
      return "Рутинные задачи";
    case "occupancy_hint":
      return "Подсказка по загрузке";
    case "pricing_hint":
      return "Подсказка по цене";
  }
}

export function syncStatusLabel(status: SyncQueueItem["status"]) {
  switch (status) {
    case "queued":
      return "В очереди";
    case "syncing":
      return "Синхронизируется";
    case "synced":
      return "Синхронизировано";
    case "failed_retryable":
      return "Ошибка, можно повторить";
    case "failed_conflict":
      return "Конфликт данных";
  }
}

export function conflictEntityLabel(entityType: SyncConflict["entityType"]) {
  switch (entityType) {
    case "reservation":
      return "Бронь";
    case "room":
      return "Номер";
    case "housekeeping_task":
      return "Задача уборки";
    case "maintenance_incident":
      return "Техзаявка";
    case "payment":
      return "Платёж";
    default:
      return entityType;
  }
}

export function roomShortLabel(roomLabel: string) {
  return roomLabel === "UNASSIGNED" ? "Не назначен" : `Номер ${roomLabel}`;
}

export function roomTypeLabel(roomType: string) {
  switch (roomType.toLowerCase()) {
    case "standard":
      return "Стандарт";
    case "double":
      return "Двухместный";
    case "family":
      return "Семейный";
    case "deluxe":
      return "Улучшенный";
    default:
      return roomType;
  }
}

export function roomPriorityLabel(priority: RoomSummary["priority"]) {
  switch (priority) {
    case "normal":
      return "Обычный";
    case "arrival_soon":
      return "Скорый заезд";
    case "blocked":
      return "Блок";
  }
}

export function propertyTypeLabel(propertyType: PropertyType) {
  switch (propertyType) {
    case "small_hotel":
      return "Небольшой отель";
    case "hostel":
      return "Хостел";
    case "guest_house":
      return "Гостевой дом";
    case "glamping":
      return "Глэмпинг";
  }
}

export function vatRateLabel(vatRate: PropertyVatRate) {
  switch (vatRate) {
    case "none":
      return "Без НДС";
    case "0":
      return "НДС 0%";
    case "10":
      return "НДС 10%";
    case "20":
      return "НДС 20%";
  }
}
