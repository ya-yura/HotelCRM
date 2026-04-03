import { z } from "zod";
import { aiAssistantItemSchema, type AIAssistantItem } from "./ai";
import type { ComplianceSubmission } from "./compliance";
import type { HousekeepingTaskSummary } from "./housekeeping";
import type { MaintenanceIncident } from "./maintenance";
import type { FolioSummary, PaymentRecord } from "./payments";
import type { ReservationSummary } from "./reservations";
import type { RoomSummary } from "./rooms";

export const managementSourceModeSchema = z.enum(["live", "cached"]);
export const managementToneSchema = z.enum(["success", "info", "warning", "danger", "neutral"]);
export const managementDateRangeSchema = z.object({
  from: z.string(),
  to: z.string()
});

export const managementKpiCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: managementToneSchema.default("neutral")
});

export const managementDashboardMetricsSchema = z.object({
  occupancyToday: z.number().min(0).max(100),
  occupancyNext7: z.number().min(0).max(100),
  occupancyNext30: z.number().min(0).max(100),
  adr: z.number().nonnegative(),
  revpar: z.number().nonnegative(),
  arrivalsToday: z.number().int().nonnegative(),
  departuresToday: z.number().int().nonnegative(),
  unpaidStays: z.number().int().nonnegative(),
  dirtyRooms: z.number().int().nonnegative(),
  blockedRooms: z.number().int().nonnegative(),
  openIncidents: z.number().int().nonnegative(),
  unresolvedCompliance: z.number().int().nonnegative(),
  directShare: z.number().min(0).max(100),
  otaShare: z.number().min(0).max(100)
});

export const managementCashSummarySchema = z.object({
  bookedRevenueTotal: z.number(),
  cashCollectedTotal: z.number(),
  outstandingBalanceTotal: z.number().nonnegative(),
  pendingFiscalReceipts: z.number().int().nonnegative(),
  unpaidReservations: z.number().int().nonnegative(),
  averageCheck: z.number().nonnegative()
});

export const managementTrendPointSchema = z.object({
  date: z.string(),
  occupancyRate: z.number().min(0).max(100),
  arrivals: z.number().int().nonnegative(),
  departures: z.number().int().nonnegative(),
  bookedRevenue: z.number(),
  cashCollected: z.number(),
  adr: z.number().nonnegative(),
  revpar: z.number().nonnegative()
});

export const managementSourceSummarySchema = z.object({
  source: z.string(),
  reservations: z.number().int().nonnegative(),
  nights: z.number().int().nonnegative(),
  bookedRevenue: z.number(),
  paidAmount: z.number(),
  balanceDue: z.number().nonnegative(),
  sharePercent: z.number().min(0).max(100)
});

export const managementDebtItemSchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  status: z.string(),
  source: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  balanceDue: z.number().nonnegative()
});

export const managementPaymentMethodSummarySchema = z.object({
  method: z.string(),
  amount: z.number(),
  count: z.number().int().nonnegative()
});

export const managementHousekeepingReportSchema = z.object({
  openTasks: z.number().int().nonnegative(),
  inspectionRequested: z.number().int().nonnegative(),
  problemReported: z.number().int().nonnegative(),
  completedToday: z.number().int().nonnegative(),
  openIncidents: z.number().int().nonnegative(),
  blockedRooms: z.number().int().nonnegative()
});

export const managementComplianceReportSchema = z.object({
  draft: z.number().int().nonnegative(),
  ready: z.number().int().nonnegative(),
  submitted: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  corrected: z.number().int().nonnegative()
});

export const managementDashboardSummarySchema = z.object({
  generatedAt: z.string(),
  sourceMode: managementSourceModeSchema.default("live"),
  range: managementDateRangeSchema,
  metrics: managementDashboardMetricsSchema,
  cash: managementCashSummarySchema,
  kpis: z.array(managementKpiCardSchema).default([]),
  series: z.array(managementTrendPointSchema).default([]),
  sourceMix: z.array(managementSourceSummarySchema).default([]),
  alerts: z.array(aiAssistantItemSchema).default([]),
  nextBestAction: z.string().default(""),
  summaryText: z.string().default("")
});

export const managementReportSummarySchema = z.object({
  generatedAt: z.string(),
  sourceMode: managementSourceModeSchema.default("live"),
  range: managementDateRangeSchema,
  metrics: managementDashboardMetricsSchema,
  cash: managementCashSummarySchema,
  avgOccupancyRate: z.number().min(0).max(100),
  totalReservations: z.number().int().nonnegative(),
  totalRoomNights: z.number().int().nonnegative(),
  cancellationCount: z.number().int().nonnegative(),
  noShowCount: z.number().int().nonnegative(),
  series: z.array(managementTrendPointSchema).default([]),
  sourceMix: z.array(managementSourceSummarySchema).default([]),
  debts: z.array(managementDebtItemSchema).default([]),
  paymentMethods: z.array(managementPaymentMethodSummarySchema).default([]),
  housekeeping: managementHousekeepingReportSchema,
  compliance: managementComplianceReportSchema,
  alerts: z.array(aiAssistantItemSchema).default([]),
  notes: z.array(z.string()).default([])
});

export const managementFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
});

export type ManagementDateRange = z.infer<typeof managementDateRangeSchema>;
export type ManagementKpiCard = z.infer<typeof managementKpiCardSchema>;
export type ManagementDashboardMetrics = z.infer<typeof managementDashboardMetricsSchema>;
export type ManagementCashSummary = z.infer<typeof managementCashSummarySchema>;
export type ManagementTrendPoint = z.infer<typeof managementTrendPointSchema>;
export type ManagementSourceSummary = z.infer<typeof managementSourceSummarySchema>;
export type ManagementDebtItem = z.infer<typeof managementDebtItemSchema>;
export type ManagementPaymentMethodSummary = z.infer<typeof managementPaymentMethodSummarySchema>;
export type ManagementHousekeepingReport = z.infer<typeof managementHousekeepingReportSchema>;
export type ManagementComplianceReport = z.infer<typeof managementComplianceReportSchema>;
export type ManagementDashboardSummary = z.infer<typeof managementDashboardSummarySchema>;
export type ManagementReportSummary = z.infer<typeof managementReportSummarySchema>;

type ManagementAnalyticsInput = {
  reservations: ReservationSummary[];
  rooms: RoomSummary[];
  folios: FolioSummary[];
  payments: PaymentRecord[];
  housekeepingTasks: HousekeepingTaskSummary[];
  maintenanceIncidents: MaintenanceIncident[];
  complianceSubmissions?: ComplianceSubmission[];
  syncConflictCount?: number;
  range?: Partial<ManagementDateRange>;
  now?: string;
  sourceMode?: "live" | "cached";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function startOfDay(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function toDateKey(input: string | Date) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  return new Date(input).toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const next = startOfDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function enumerateDates(from: string, to: string) {
  const values: string[] = [];
  let cursor = from;
  let guard = 0;

  while (cursor <= to && guard < 400) {
    values.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  return values;
}

function normalizeRange(range: Partial<ManagementDateRange> | undefined, nowIso: string, daysForward: number) {
  const today = toDateKey(nowIso);
  return {
    from: range?.from ?? addDays(today, -(daysForward - 1)),
    to: range?.to ?? today
  };
}

function overlapNights(reservation: ReservationSummary, from: string, toExclusive: string) {
  const start = reservation.checkInDate > from ? reservation.checkInDate : from;
  const end = reservation.checkOutDate < toExclusive ? reservation.checkOutDate : toExclusive;
  if (start >= end) {
    return 0;
  }

  return Math.max(
    Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000),
    0
  );
}

function reservationNightCount(reservation: ReservationSummary) {
  return Math.max(
    Math.round(
      (startOfDay(reservation.checkOutDate).getTime() - startOfDay(reservation.checkInDate).getTime()) /
        86_400_000
    ),
    1
  );
}

function isCancelledLike(status: ReservationSummary["status"]) {
  return status === "cancelled" || status === "no_show";
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(Math.round(value * 100) / 100);
}

function sourceLabel(reservation: ReservationSummary) {
  const channel = reservation.sourceAttribution?.partnerName || reservation.sourceAttribution?.channel;
  if (channel) {
    return channel;
  }

  switch (reservation.source) {
    case "direct":
      return "Прямые";
    case "phone":
      return "Телефон";
    case "walk_in":
      return "С улицы";
    case "whatsapp":
      return "WhatsApp";
    case "ota":
      return "OTA";
    case "partner":
      return "Партнёры";
    default:
      return "Ручной ввод";
  }
}

function calculateDailyPoint(input: ManagementAnalyticsInput, date: string, saleableRooms: number): ManagementTrendPoint {
  const activeReservations = input.reservations.filter(
    (reservation) => !isCancelledLike(reservation.status) && reservation.checkInDate <= date && reservation.checkOutDate > date
  );
  const bookedRoomNights = activeReservations.length;
  const bookedRevenue = activeReservations.reduce((sum, reservation) => {
    const nightlyRate = (reservation.totalAmount ?? 0) / reservationNightCount(reservation);
    return sum + nightlyRate;
  }, 0);
  const cashCollected = input.payments
    .filter((payment) => toDateKey(payment.receivedAt) === date)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const occupancyRate =
    saleableRooms > 0 ? clamp(Math.round((bookedRoomNights / saleableRooms) * 100), 0, 100) : 0;
  const adr = bookedRoomNights > 0 ? bookedRevenue / bookedRoomNights : 0;
  const revpar = saleableRooms > 0 ? bookedRevenue / saleableRooms : 0;

  return {
    date,
    occupancyRate,
    arrivals: input.reservations.filter(
      (reservation) => !isCancelledLike(reservation.status) && reservation.checkInDate === date
    ).length,
    departures: input.reservations.filter(
      (reservation) => !isCancelledLike(reservation.status) && reservation.checkOutDate === date
    ).length,
    bookedRevenue: Math.round(bookedRevenue),
    cashCollected: Math.round(cashCollected),
    adr: Math.round(adr),
    revpar: Math.round(revpar)
  };
}

function occupancyForWindow(reservations: ReservationSummary[], rooms: RoomSummary[], from: string, days: number) {
  const saleableRooms = Math.max(
    rooms.filter((room) => room.status !== "out_of_service").length,
    1
  );
  const dates = enumerateDates(from, addDays(from, days - 1));
  const occupiedNights = dates.reduce(
    (sum, date) =>
      sum +
      reservations.filter(
        (reservation) =>
          !isCancelledLike(reservation.status) &&
          reservation.checkInDate <= date &&
          reservation.checkOutDate > date
      ).length,
    0
  );

  return clamp(Math.round((occupiedNights / (saleableRooms * Math.max(dates.length, 1))) * 100), 0, 100);
}

function sourceMix(
  reservations: ReservationSummary[],
  folios: FolioSummary[],
  range: ManagementDateRange
): ManagementSourceSummary[] {
  const map = new Map<string, ManagementSourceSummary>();
  const rangeEndExclusive = addDays(range.to, 1);

  for (const reservation of reservations) {
    if (isCancelledLike(reservation.status)) {
      continue;
    }

    const overlappingNights = overlapNights(reservation, range.from, rangeEndExclusive);
    if (overlappingNights <= 0) {
      continue;
    }

    const source = sourceLabel(reservation);
    const nightlyRate = (reservation.totalAmount ?? 0) / reservationNightCount(reservation);
    const bookedRevenue = nightlyRate * overlappingNights;
    const folio = folios.find((entry) => entry.reservationId === reservation.id);
    const current = map.get(source) ?? {
      source,
      reservations: 0,
      nights: 0,
      bookedRevenue: 0,
      paidAmount: 0,
      balanceDue: 0,
      sharePercent: 0
    };

    map.set(source, {
      ...current,
      reservations: current.reservations + 1,
      nights: current.nights + overlappingNights,
      bookedRevenue: current.bookedRevenue + bookedRevenue,
      paidAmount: current.paidAmount + (folio?.paidAmount ?? reservation.paidAmount ?? 0),
      balanceDue: current.balanceDue + (folio?.balanceDue ?? reservation.balanceDue ?? 0)
    });
  }

  const values = [...map.values()].sort((left, right) => right.bookedRevenue - left.bookedRevenue);
  const totalRevenue = values.reduce((sum, item) => sum + item.bookedRevenue, 0);
  return values.map((item) => ({
    ...item,
    bookedRevenue: Math.round(item.bookedRevenue),
    paidAmount: Math.round(item.paidAmount),
    balanceDue: Math.round(item.balanceDue),
    sharePercent: totalRevenue > 0 ? clamp(Math.round((item.bookedRevenue / totalRevenue) * 100), 0, 100) : 0
  }));
}

function paymentMethodMix(payments: PaymentRecord[], range: ManagementDateRange): ManagementPaymentMethodSummary[] {
  const map = new Map<string, ManagementPaymentMethodSummary>();

  for (const payment of payments) {
    const date = toDateKey(payment.receivedAt);
    if (date < range.from || date > range.to) {
      continue;
    }

    const current = map.get(payment.method) ?? { method: payment.method, amount: 0, count: 0 };
    map.set(payment.method, {
      method: payment.method,
      amount: current.amount + payment.amount,
      count: current.count + 1
    });
  }

  return [...map.values()]
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
    .map((item) => ({
      ...item,
      amount: Math.round(item.amount)
    }));
}

function buildMetrics(input: ManagementAnalyticsInput, range: ManagementDateRange, series: ManagementTrendPoint[]) {
  const today = toDateKey(input.now ?? new Date().toISOString());
  const saleableRooms = Math.max(
    input.rooms.filter((room) => room.status !== "out_of_service").length,
    1
  );
  const rangeEndExclusive = addDays(range.to, 1);
  const totalRoomNights = input.reservations.reduce((sum, reservation) => {
    if (isCancelledLike(reservation.status)) {
      return sum;
    }

    return sum + overlapNights(reservation, range.from, rangeEndExclusive);
  }, 0);
  const bookedRevenueTotal = input.reservations.reduce((sum, reservation) => {
    if (isCancelledLike(reservation.status)) {
      return sum;
    }

    const overlappingNights = overlapNights(reservation, range.from, rangeEndExclusive);
    if (overlappingNights <= 0) {
      return sum;
    }

    return sum + ((reservation.totalAmount ?? 0) / reservationNightCount(reservation)) * overlappingNights;
  }, 0);
  const cashCollectedTotal = input.payments.reduce((sum, payment) => {
    const date = toDateKey(payment.receivedAt);
    return date >= range.from && date <= range.to ? sum + payment.amount : sum;
  }, 0);
  const outstandingBalanceTotal = input.folios.reduce((sum, folio) => sum + folio.balanceDue, 0);
  const pendingFiscalReceipts = input.folios.reduce(
    (sum, folio) => sum + folio.pendingFiscalReceipts,
    0
  );
  const unpaidReservations = input.folios.filter((folio) => folio.balanceDue > 0).length;
  const adr = totalRoomNights > 0 ? bookedRevenueTotal / totalRoomNights : 0;
  const revpar = series.length > 0 ? bookedRevenueTotal / (saleableRooms * series.length) : 0;
  const arrivalsToday = input.reservations.filter(
    (reservation) => !isCancelledLike(reservation.status) && reservation.checkInDate === today
  ).length;
  const departuresToday = input.reservations.filter(
    (reservation) => !isCancelledLike(reservation.status) && reservation.checkOutDate === today
  ).length;
  const dirtyRooms = input.rooms.filter(
    (room) => room.status === "dirty" || room.status === "cleaning"
  ).length;
  const blockedRooms = input.rooms.filter(
    (room) => room.status === "blocked_maintenance" || room.status === "out_of_service"
  ).length;
  const openIncidents = input.maintenanceIncidents.filter(
    (incident) => incident.status === "open" || incident.status === "in_progress"
  ).length;
  const unresolvedCompliance = (input.complianceSubmissions ?? []).filter(
    (submission) => submission.status === "failed" || submission.status === "draft"
  ).length;
  const sourceBreakdown = sourceMix(input.reservations, input.folios, range);
  const directShare =
    sourceBreakdown.find((item) => item.source === "Прямые")?.sharePercent ?? 0;
  const otaShare = sourceBreakdown
    .filter((item) => item.source.includes("OTA") || item.source.includes("booking") || item.source.includes("ostrovok") || item.source.includes("yandex"))
    .reduce((sum, item) => sum + item.sharePercent, 0);

  return {
    metrics: {
      occupancyToday: occupancyForWindow(input.reservations, input.rooms, today, 1),
      occupancyNext7: occupancyForWindow(input.reservations, input.rooms, today, 7),
      occupancyNext30: occupancyForWindow(input.reservations, input.rooms, today, 30),
      adr: Math.round(adr),
      revpar: Math.round(revpar),
      arrivalsToday,
      departuresToday,
      unpaidStays: unpaidReservations,
      dirtyRooms,
      blockedRooms,
      openIncidents,
      unresolvedCompliance,
      directShare,
      otaShare: clamp(otaShare, 0, 100)
    },
    cash: {
      bookedRevenueTotal: Math.round(bookedRevenueTotal),
      cashCollectedTotal: Math.round(cashCollectedTotal),
      outstandingBalanceTotal: Math.round(outstandingBalanceTotal),
      pendingFiscalReceipts,
      unpaidReservations,
      averageCheck:
        input.reservations.length > 0 ? Math.round(bookedRevenueTotal / input.reservations.length) : 0
    },
    totalRoomNights,
    totalReservations: input.reservations.filter(
      (reservation) =>
        !isCancelledLike(reservation.status) &&
        overlapNights(reservation, range.from, rangeEndExclusive) > 0
    ).length,
    cancellationCount: input.reservations.filter((reservation) => reservation.status === "cancelled").length,
    noShowCount: input.reservations.filter((reservation) => reservation.status === "no_show").length,
    avgOccupancyRate:
      series.length > 0
        ? Math.round(series.reduce((sum, point) => sum + point.occupancyRate, 0) / series.length)
        : 0
  };
}

export function buildManagementAlerts(input: Omit<ManagementAnalyticsInput, "range" | "sourceMode">): AIAssistantItem[] {
  const nowIso = input.now ?? new Date().toISOString();
  const today = toDateKey(nowIso);
  const range = {
    from: today,
    to: addDays(today, 30)
  };
  const saleableRooms = Math.max(
    input.rooms.filter((room) => room.status !== "out_of_service").length,
    1
  );
  const series = enumerateDates(range.from, addDays(today, 13)).map((date) =>
    calculateDailyPoint(input, date, saleableRooms)
  );
  const { metrics } = buildMetrics(input, range, series);
  const alerts: AIAssistantItem[] = [];
  const arrivalsNeedingPayment = input.reservations.filter((reservation) => {
    if (isCancelledLike(reservation.status) || reservation.checkInDate !== today) {
      return false;
    }

    const folio = input.folios.find((entry) => entry.reservationId === reservation.id);
    return (folio?.balanceDue ?? reservation.balanceDue ?? 0) > 0;
  });
  const dirtyTasks = input.housekeepingTasks.filter(
    (task) => task.status !== "completed" && task.status !== "cancelled"
  );
  const unassignedConfirmed = input.reservations.filter(
    (reservation) => reservation.status === "confirmed" && reservation.roomLabel === "UNASSIGNED"
  );
  const openIncidents = input.maintenanceIncidents.filter(
    (incident) => incident.status === "open" || incident.status === "in_progress"
  );
  const failedCompliance = (input.complianceSubmissions ?? []).filter(
    (submission) => submission.status === "failed"
  );
  const inventoryImpact = Math.max(metrics.blockedRooms, openIncidents.length);

  if (arrivalsNeedingPayment.length > 0) {
    alerts.push({
      id: `ai_daily_unpaid_${today}`,
      type: "daily_summary",
      title: `${arrivalsNeedingPayment.length} заезд${arrivalsNeedingPayment.length > 1 ? "а" : ""} сегодня без полной оплаты`,
      detail: arrivalsNeedingPayment
        .slice(0, 2)
        .map((reservation) => `${reservation.guestName}: долг ${formatAmount(reservation.balanceDue)} ₽`)
        .join("; "),
      confidence: 0.95,
      actionLabel: "Открыть оплаты",
      actionTarget: "/payments",
      dismissible: true
    });
  }

  if (metrics.dirtyRooms > 0) {
    alerts.push({
      id: `ai_housekeeping_${today}`,
      type: "admin_routine",
      title: `${metrics.dirtyRooms} номер${metrics.dirtyRooms > 1 ? "ов ждут" : " ждёт"} выпуска после уборки`,
      detail: `${dirtyTasks.length} активных задач ещё удерживают инвентарь вне продажи.`,
      confidence: 0.91,
      actionLabel: "Открыть уборку",
      actionTarget: "/housekeeping",
      dismissible: true
    });
  }

  if (unassignedConfirmed.length > 0) {
    alerts.push({
      id: `ai_occupancy_${today}`,
      type: "occupancy_hint",
      title: `${unassignedConfirmed.length} подтверждённ${unassignedConfirmed.length > 1 ? "ые брони ждут" : "ая бронь ждёт"} назначения номера`,
      detail: "Назначьте номер заранее, чтобы не терять время на ресепшене в пиковый час.",
      confidence: 0.88,
      actionLabel: "Открыть брони",
      actionTarget: "/reservations",
      dismissible: true
    });
  }

  if (openIncidents.length > 0 || metrics.blockedRooms > 0) {
    alerts.push({
      id: `ai_maintenance_${today}`,
      type: "anomaly",
      title: `${inventoryImpact} проблем${inventoryImpact > 1 ? "" : "а"} по техслужбе влияет на фонд`,
      detail: `${openIncidents.length} активных инцидентов влияют на продажу и готовность фонда.`,
      confidence: 0.9,
      actionLabel: "Открыть техслужбу",
      actionTarget: "/maintenance",
      dismissible: true
    });
  }

  if (failedCompliance.length > 0) {
    alerts.push({
      id: `ai_compliance_${today}`,
      type: "anomaly",
      title: `${failedCompliance.length} сб${failedCompliance.length > 1 ? "оя" : "ой"} по отчётности требуют повторной отправки`,
      detail: "Исправьте комплаенс до закрытия дня, чтобы не копить ручные корректировки.",
      confidence: 0.92,
      actionLabel: "Открыть комплаенс",
      actionTarget: "/compliance",
      dismissible: true
    });
  }

  if (metrics.occupancyNext7 >= 85) {
    alerts.push({
      id: `ai_pricing_${today}`,
      type: "pricing_hint",
      title: `Загрузка на 7 дней уже ${metrics.occupancyNext7}%`,
      detail: "Высокая загрузка означает, что можно проверить тарифы и долю прямых продаж до следующего пика.",
      confidence: 0.78,
      actionLabel: "Открыть отчёты",
      actionTarget: "/reports",
      dismissible: true
    });
  }

  if ((input.syncConflictCount ?? 0) > 0) {
    const syncConflictCount = input.syncConflictCount ?? 0;
    alerts.push({
      id: `ai_sync_${today}`,
      type: "anomaly",
      title: `${syncConflictCount} конфликт${syncConflictCount > 1 ? "а" : ""} синхронизации жд${syncConflictCount > 1 ? "ут" : "ёт"} решения`,
      detail: "Сначала разберите конфликт, потом доверяйте цифрам по номерному фонду и оплатам.",
      confidence: 0.89,
      actionLabel: "Открыть конфликт",
      actionTarget: "/today#conflict-inbox",
      dismissible: true
    });
  }

  return alerts.slice(0, 6);
}

export function buildManagementDashboardSummary(input: ManagementAnalyticsInput): ManagementDashboardSummary {
  const nowIso = input.now ?? new Date().toISOString();
  const range = normalizeRange(input.range, nowIso, 7);
  const saleableRooms = Math.max(
    input.rooms.filter((room) => room.status !== "out_of_service").length,
    1
  );
  const series = enumerateDates(range.from, range.to).map((date) => calculateDailyPoint(input, date, saleableRooms));
  const { metrics, cash } = buildMetrics(input, range, series);
  const alerts = buildManagementAlerts(input);
  const sourceBreakdown = sourceMix(input.reservations, input.folios, range);
  const nextBestAction =
    alerts[0]?.title ??
    (metrics.dirtyRooms > 0
      ? "Сначала освободите грязные номера под ближайшие заезды."
      : "Критичных блокеров нет, можно смотреть аналитику продаж.");

  return {
    generatedAt: nowIso,
    sourceMode: input.sourceMode ?? "live",
    range,
    metrics,
    cash,
    kpis: [
      {
        id: "occ_today",
        label: "Загрузка сегодня",
        value: `${metrics.occupancyToday}%`,
        detail: `${metrics.arrivalsToday} заездов и ${metrics.departuresToday} выездов`,
        tone: metrics.occupancyToday >= 75 ? "success" : "info"
      },
      {
        id: "occ_7",
        label: "Загрузка 7 дней",
        value: `${metrics.occupancyNext7}%`,
        detail: "Смотрите будущий пик заранее",
        tone: metrics.occupancyNext7 >= 80 ? "warning" : "info"
      },
      {
        id: "occ_30",
        label: "Загрузка 30 дней",
        value: `${metrics.occupancyNext30}%`,
        detail: "Помогает видеть окно продаж",
        tone: metrics.occupancyNext30 >= 70 ? "success" : "neutral"
      },
      {
        id: "adr",
        label: "ADR",
        value: `${formatAmount(metrics.adr)} ₽`,
        detail: "Средний доход на занятый номер",
        tone: "success"
      },
      {
        id: "revpar",
        label: "RevPAR",
        value: `${formatAmount(metrics.revpar)} ₽`,
        detail: "Доход на доступный номер",
        tone: "info"
      },
      {
        id: "unpaid",
        label: "Неоплаченные проживания",
        value: String(metrics.unpaidStays),
        detail: `${formatAmount(cash.outstandingBalanceTotal)} ₽ ещё не собрано`,
        tone: metrics.unpaidStays > 0 ? "warning" : "success"
      },
      {
        id: "dirty",
        label: "Грязные номера",
        value: String(metrics.dirtyRooms),
        detail: `${metrics.blockedRooms} заблокировано, ${metrics.openIncidents} инцидентов`,
        tone: metrics.dirtyRooms > 0 ? "danger" : "success"
      },
      {
        id: "source",
        label: "Прямые продажи",
        value: `${metrics.directShare}%`,
        detail: `OTA занимают ${metrics.otaShare}%`,
        tone: metrics.directShare >= 40 ? "success" : "warning"
      }
    ],
    series,
    sourceMix: sourceBreakdown,
    alerts,
    nextBestAction,
    summaryText: `Сейчас загрузка на ближайшие 7 дней ${metrics.occupancyNext7}%, долг по проживанию ${formatAmount(cash.outstandingBalanceTotal)} ₽, а прямые продажи занимают ${metrics.directShare}%.`
  };
}

export function buildManagementReportSummary(input: ManagementAnalyticsInput): ManagementReportSummary {
  const nowIso = input.now ?? new Date().toISOString();
  const range = input.range?.from || input.range?.to
    ? {
        from: input.range?.from ?? toDateKey(nowIso),
        to: input.range?.to ?? toDateKey(nowIso)
      }
    : (() => {
        const now = new Date(nowIso);
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
          .toISOString()
          .slice(0, 10);
        const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
          .toISOString()
          .slice(0, 10);
        return { from: monthStart, to: monthEnd };
      })();
  const saleableRooms = Math.max(
    input.rooms.filter((room) => room.status !== "out_of_service").length,
    1
  );
  const series = enumerateDates(range.from, range.to).map((date) => calculateDailyPoint(input, date, saleableRooms));
  const stats = buildMetrics(input, range, series);
  const sourceBreakdown = sourceMix(input.reservations, input.folios, range);
  const debts = input.folios
    .filter((folio) => folio.balanceDue > 0)
    .map((folio) => {
      const reservation = input.reservations.find((entry) => entry.id === folio.reservationId);
      return {
        reservationId: folio.reservationId,
        guestName: folio.guestName,
        status: reservation?.status ?? "unknown",
        source: reservation ? sourceLabel(reservation) : "Неизвестно",
        checkInDate: reservation?.checkInDate ?? "",
        checkOutDate: reservation?.checkOutDate ?? "",
        balanceDue: Math.round(folio.balanceDue)
      };
    })
    .sort((left, right) => right.balanceDue - left.balanceDue);
  const today = toDateKey(nowIso);
  const housekeeping = {
    openTasks: input.housekeepingTasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length,
    inspectionRequested: input.housekeepingTasks.filter((task) => task.status === "inspection_requested").length,
    problemReported: input.housekeepingTasks.filter((task) => task.status === "problem_reported").length,
    completedToday: input.housekeepingTasks.filter(
      (task) => task.status === "completed" && toDateKey(task.updatedAt) === today
    ).length,
    openIncidents: input.maintenanceIncidents.filter(
      (incident) => incident.status === "open" || incident.status === "in_progress"
    ).length,
    blockedRooms: input.rooms.filter(
      (room) => room.status === "blocked_maintenance" || room.status === "out_of_service"
    ).length
  };
  const compliance = {
    draft: (input.complianceSubmissions ?? []).filter((item) => item.status === "draft").length,
    ready: (input.complianceSubmissions ?? []).filter((item) => item.status === "ready").length,
    submitted: (input.complianceSubmissions ?? []).filter((item) => item.status === "submitted").length,
    failed: (input.complianceSubmissions ?? []).filter((item) => item.status === "failed").length,
    corrected: (input.complianceSubmissions ?? []).filter((item) => item.status === "corrected").length
  };

  return {
    generatedAt: nowIso,
    sourceMode: input.sourceMode ?? "live",
    range,
    metrics: stats.metrics,
    cash: stats.cash,
    avgOccupancyRate: stats.avgOccupancyRate,
    totalReservations: stats.totalReservations,
    totalRoomNights: stats.totalRoomNights,
    cancellationCount: stats.cancellationCount,
    noShowCount: stats.noShowCount,
    series,
    sourceMix: sourceBreakdown,
    debts,
    paymentMethods: paymentMethodMix(input.payments, range),
    housekeeping,
    compliance,
    alerts: buildManagementAlerts(input),
    notes: [
      "Загрузка и ADR считаются по бронированиям и ночам в выбранном диапазоне.",
      "Деньги и долг считаются по folio и фактическим платежам, чтобы отчёт сходился с операционным контуром."
    ]
  };
}

export function buildManagementReportCsv(report: ManagementReportSummary) {
  const lines: string[] = [];
  lines.push("Section,Metric,Value");
  lines.push(`Summary,Период,${report.range.from} - ${report.range.to}`);
  lines.push(`Summary,Загрузка средняя,${report.avgOccupancyRate}%`);
  lines.push(`Summary,ADR,${report.metrics.adr}`);
  lines.push(`Summary,RevPAR,${report.metrics.revpar}`);
  lines.push(`Summary,Выручка по бронированиям,${report.cash.bookedRevenueTotal}`);
  lines.push(`Summary,Собрано денег,${report.cash.cashCollectedTotal}`);
  lines.push(`Summary,Долг,${report.cash.outstandingBalanceTotal}`);
  lines.push("");
  lines.push("Daily,Date,Occupancy,Arrivals,Departures,BookedRevenue,CashCollected,ADR,RevPAR");
  report.series.forEach((point) => {
    lines.push(
      `Daily,${point.date},${point.occupancyRate},${point.arrivals},${point.departures},${point.bookedRevenue},${point.cashCollected},${point.adr},${point.revpar}`
    );
  });
  lines.push("");
  lines.push("Sources,Source,Reservations,Nights,BookedRevenue,PaidAmount,BalanceDue,SharePercent");
  report.sourceMix.forEach((source) => {
    lines.push(
      `Sources,${source.source},${source.reservations},${source.nights},${source.bookedRevenue},${source.paidAmount},${source.balanceDue},${source.sharePercent}`
    );
  });
  lines.push("");
  lines.push("Debt,Guest,Status,Source,CheckIn,CheckOut,BalanceDue");
  report.debts.forEach((debt) => {
    lines.push(
      `Debt,${debt.guestName},${debt.status},${debt.source},${debt.checkInDate},${debt.checkOutDate},${debt.balanceDue}`
    );
  });
  lines.push("");
  lines.push("Payments,Method,Count,Amount");
  report.paymentMethods.forEach((method) => {
    lines.push(`Payments,${method.method},${method.count},${method.amount}`);
  });
  lines.push("");
  lines.push("Housekeeping,Metric,Value");
  lines.push(`Housekeeping,OpenTasks,${report.housekeeping.openTasks}`);
  lines.push(`Housekeeping,InspectionRequested,${report.housekeeping.inspectionRequested}`);
  lines.push(`Housekeeping,ProblemReported,${report.housekeeping.problemReported}`);
  lines.push(`Housekeeping,CompletedToday,${report.housekeeping.completedToday}`);
  lines.push(`Housekeeping,OpenIncidents,${report.housekeeping.openIncidents}`);
  lines.push(`Housekeeping,BlockedRooms,${report.housekeeping.blockedRooms}`);
  lines.push("");
  lines.push("Compliance,Metric,Value");
  lines.push(`Compliance,Draft,${report.compliance.draft}`);
  lines.push(`Compliance,Ready,${report.compliance.ready}`);
  lines.push(`Compliance,Submitted,${report.compliance.submitted}`);
  lines.push(`Compliance,Failed,${report.compliance.failed}`);
  lines.push(`Compliance,Corrected,${report.compliance.corrected}`);

  return lines.join("\n");
}
