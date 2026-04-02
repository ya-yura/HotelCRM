import { z } from "zod";

export const azRoomStatusSchema = z.enum(["available", "occupied", "clean", "dirty"]);

export const azPriceRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  multiplier: z.number().positive().default(1),
  fixedPrice: z.number().nonnegative().optional()
});

export const azRoomSchema = z.object({
  id: z.string(),
  type: z.string(),
  number: z.string(),
  priceRules: z.array(azPriceRuleSchema),
  status: azRoomStatusSchema
});

export const azRoomCreateSchema = azRoomSchema.omit({ id: true });
export const azRoomUpdateSchema = azRoomCreateSchema.partial();

export const azBookingServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative()
});

export const azBookingStatusSchema = z.enum([
  "draft",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show"
]);

export const azBookingDatesSchema = z.object({
  checkIn: z.string(),
  checkOut: z.string()
});

export const azBookingSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  roomId: z.string(),
  dates: azBookingDatesSchema,
  status: azBookingStatusSchema,
  services: z.array(azBookingServiceSchema),
  total: z.number().nonnegative(),
  channel: z.string()
});

export const azBookingViewSchema = azBookingSchema.extend({
  guestName: z.string(),
  roomNumber: z.string(),
  roomType: z.string()
});

export const azSettlementLineSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["room", "service"]),
  amount: z.number().nonnegative()
});

export const azBookingCreateSchema = z.object({
  guestName: z.string().min(2),
  guestPhone: z.string().default(""),
  guestEmail: z.string().default(""),
  roomId: z.string().min(1),
  dates: azBookingDatesSchema,
  status: azBookingStatusSchema,
  services: z.array(azBookingServiceSchema),
  total: z.number().nonnegative(),
  channel: z.string().min(2)
});

export const azBookingUpdateSchema = azBookingCreateSchema.partial();

export const azCheckInRequestSchema = z.object({
  roomId: z.string().min(1),
  services: z.array(azBookingServiceSchema).default([])
});

export const azCheckOutRequestSchema = z.object({
  services: z.array(azBookingServiceSchema).default([])
});

export const azSettlementSchema = z.object({
  bookingId: z.string(),
  guestName: z.string(),
  roomId: z.string(),
  roomNumber: z.string(),
  roomType: z.string(),
  status: azBookingStatusSchema,
  nights: z.number().int().nonnegative(),
  roomAmount: z.number().nonnegative(),
  servicesAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  dates: azBookingDatesSchema,
  services: z.array(azBookingServiceSchema),
  lines: z.array(azSettlementLineSchema)
});

export const azGuestContactSchema = z.object({
  phone: z.string().default(""),
  email: z.string().default("")
});

export const azGuestSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact: azGuestContactSchema,
  history: z.array(z.string())
});

export const azHousekeepingTaskStatusSchema = z.enum([
  "queued",
  "in_progress",
  "done",
  "skipped"
]);

export const azHousekeepingTaskSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  date: z.string(),
  status: azHousekeepingTaskStatusSchema,
  assignee: z.string()
});

export const azHousekeepingTaskViewSchema = azHousekeepingTaskSchema.extend({
  roomNumber: z.string(),
  roomType: z.string(),
  roomStatus: azRoomStatusSchema,
  bookingId: z.string().optional(),
  guestName: z.string().optional(),
  bookingStatus: azBookingStatusSchema.optional()
});

export const azHousekeepingTaskUpdateSchema = z.object({
  status: azHousekeepingTaskStatusSchema.optional(),
  assignee: z.string().optional()
});

export const azHousekeepingDashboardSchema = z.object({
  totalTasks: z.number().int().nonnegative(),
  queuedTasks: z.number().int().nonnegative(),
  inProgressTasks: z.number().int().nonnegative(),
  doneTasks: z.number().int().nonnegative(),
  dirtyRooms: z.number().int().nonnegative(),
  occupiedRooms: z.number().int().nonnegative(),
  unassignedTasks: z.number().int().nonnegative()
});

export const azTodayBookingPreviewSchema = z.object({
  id: z.string(),
  guestName: z.string(),
  roomNumber: z.string(),
  status: azBookingStatusSchema,
  dateLabel: z.string()
});

export const azTodayTaskPreviewSchema = z.object({
  id: z.string(),
  roomNumber: z.string(),
  roomType: z.string(),
  status: azHousekeepingTaskStatusSchema,
  assignee: z.string(),
  guestName: z.string().optional()
});

export const azTodayDashboardSchema = z.object({
  date: z.string(),
  scope: z.enum(["full", "staff"]),
  arrivalsCount: z.number().int().nonnegative(),
  departuresCount: z.number().int().nonnegative(),
  occupancyRate: z.number().int().min(0).max(100),
  occupiedRooms: z.number().int().nonnegative(),
  readyRooms: z.number().int().nonnegative(),
  dirtyRooms: z.number().int().nonnegative(),
  tasksInProgress: z.number().int().nonnegative(),
  myTasksCount: z.number().int().nonnegative(),
  arrivals: z.array(azTodayBookingPreviewSchema),
  departures: z.array(azTodayBookingPreviewSchema),
  housekeepingTasks: z.array(azTodayTaskPreviewSchema)
});

export const azReportChannelMetricSchema = z.object({
  channel: z.string(),
  bookings: z.number().int().nonnegative(),
  revenue: z.number().nonnegative()
});

export const azReportSeriesPointSchema = z.object({
  date: z.string(),
  bookings: z.number().int().nonnegative(),
  occupiedRooms: z.number().int().nonnegative(),
  occupancyRate: z.number().min(0).max(100),
  revenue: z.number().nonnegative()
});

export const azReportSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  totalRevenue: z.number().nonnegative(),
  totalBookings: z.number().int().nonnegative(),
  avgOccupancyRate: z.number().min(0).max(100),
  adr: z.number().nonnegative(),
  soldRoomNights: z.number().int().nonnegative(),
  availableRoomNights: z.number().int().nonnegative(),
  channels: z.array(azReportChannelMetricSchema),
  series: z.array(azReportSeriesPointSchema)
});

export const azChannelNameSchema = z.enum(["booking_com", "ostrovok"]);
export const azChannelSyncActionSchema = z.enum(["inventory", "prices"]);
export const azChannelSyncStatusSchema = z.enum(["idle", "success", "failed"]);

export const azChannelRoomSyncSchema = z.object({
  channel: azChannelNameSchema,
  inventoryStatus: azChannelSyncStatusSchema,
  inventorySyncedAt: z.string().optional(),
  priceStatus: azChannelSyncStatusSchema,
  priceSyncedAt: z.string().optional()
});

export const azChannelRoomViewSchema = z.object({
  roomId: z.string(),
  roomNumber: z.string(),
  roomType: z.string(),
  roomStatus: azRoomStatusSchema,
  available: z.boolean(),
  nextAvailableDate: z.string(),
  basePrice: z.number().nonnegative(),
  channels: z.array(azChannelRoomSyncSchema)
});

export const azChannelDashboardSchema = z.object({
  generatedAt: z.string(),
  rooms: z.array(azChannelRoomViewSchema)
});

export const azChannelSyncRequestSchema = z.object({
  roomId: z.string().optional(),
  channel: azChannelNameSchema.optional()
});

export const azChannelSyncResultSchema = z.object({
  processedRooms: z.number().int().nonnegative(),
  processedChannels: z.number().int().nonnegative(),
  action: azChannelSyncActionSchema,
  syncedAt: z.string()
});

export const azChannelSyncRecordSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  channel: azChannelNameSchema,
  action: azChannelSyncActionSchema,
  status: azChannelSyncStatusSchema,
  syncedAt: z.string(),
  message: z.string()
});

export const azReportDataSchema = z.object({
  id: z.string(),
  date: z.string(),
  occupancyRate: z.number().min(0).max(100),
  revenue: z.number().nonnegative(),
  bookings: z.number().int().nonnegative(),
  adr: z.number().nonnegative(),
  channels: z.array(azReportChannelMetricSchema)
});

export type AzRoom = z.infer<typeof azRoomSchema>;
export type AzRoomStatus = z.infer<typeof azRoomStatusSchema>;
export type AzPriceRule = z.infer<typeof azPriceRuleSchema>;
export type AzRoomCreate = z.infer<typeof azRoomCreateSchema>;
export type AzRoomUpdate = z.infer<typeof azRoomUpdateSchema>;
export type AzBooking = z.infer<typeof azBookingSchema>;
export type AzBookingView = z.infer<typeof azBookingViewSchema>;
export type AzBookingStatus = z.infer<typeof azBookingStatusSchema>;
export type AzBookingService = z.infer<typeof azBookingServiceSchema>;
export type AzBookingCreate = z.infer<typeof azBookingCreateSchema>;
export type AzBookingUpdate = z.infer<typeof azBookingUpdateSchema>;
export type AzCheckInRequest = z.infer<typeof azCheckInRequestSchema>;
export type AzCheckOutRequest = z.infer<typeof azCheckOutRequestSchema>;
export type AzSettlement = z.infer<typeof azSettlementSchema>;
export type AzSettlementLine = z.infer<typeof azSettlementLineSchema>;
export type AzGuest = z.infer<typeof azGuestSchema>;
export type AzGuestContact = z.infer<typeof azGuestContactSchema>;
export type AzHousekeepingTask = z.infer<typeof azHousekeepingTaskSchema>;
export type AzHousekeepingTaskStatus = z.infer<typeof azHousekeepingTaskStatusSchema>;
export type AzHousekeepingTaskView = z.infer<typeof azHousekeepingTaskViewSchema>;
export type AzHousekeepingTaskUpdate = z.infer<typeof azHousekeepingTaskUpdateSchema>;
export type AzHousekeepingDashboard = z.infer<typeof azHousekeepingDashboardSchema>;
export type AzTodayBookingPreview = z.infer<typeof azTodayBookingPreviewSchema>;
export type AzTodayTaskPreview = z.infer<typeof azTodayTaskPreviewSchema>;
export type AzTodayDashboard = z.infer<typeof azTodayDashboardSchema>;
export type AzReportChannelMetric = z.infer<typeof azReportChannelMetricSchema>;
export type AzReportData = z.infer<typeof azReportDataSchema>;
export type AzReportSeriesPoint = z.infer<typeof azReportSeriesPointSchema>;
export type AzReportSummary = z.infer<typeof azReportSummarySchema>;
export type AzChannelName = z.infer<typeof azChannelNameSchema>;
export type AzChannelSyncAction = z.infer<typeof azChannelSyncActionSchema>;
export type AzChannelSyncStatus = z.infer<typeof azChannelSyncStatusSchema>;
export type AzChannelRoomSync = z.infer<typeof azChannelRoomSyncSchema>;
export type AzChannelRoomView = z.infer<typeof azChannelRoomViewSchema>;
export type AzChannelDashboard = z.infer<typeof azChannelDashboardSchema>;
export type AzChannelSyncRequest = z.infer<typeof azChannelSyncRequestSchema>;
export type AzChannelSyncResult = z.infer<typeof azChannelSyncResultSchema>;
export type AzChannelSyncRecord = z.infer<typeof azChannelSyncRecordSchema>;
