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

export const azChannelNameSchema = z.enum(["booking_com", "ostrovok", "yandex_travel"]);
export const azChannelSyncActionSchema = z.enum(["inventory", "prices", "bookings", "cancellations", "modifications"]);
export const azChannelSyncStatusSchema = z.enum(["idle", "success", "failed"]);
export const azChannelAccountStatusSchema = z.enum(["connected", "sandbox", "error"]);
export const azChannelTaskStatusSchema = z.enum(["queued", "processing", "success", "failed"]);
export const azChannelMessageDirectionSchema = z.enum(["outbound", "inbound"]);
export const azChannelMessageTypeSchema = z.enum(["inventory", "prices", "booking", "cancellation", "modification"]);

export const azDistributionAccountSchema = z.object({
  id: z.string(),
  channel: azChannelNameSchema,
  title: z.string(),
  status: azChannelAccountStatusSchema,
  credentialsMask: z.string(),
  pullBookingsEnabled: z.boolean().default(true),
  pushInventoryEnabled: z.boolean().default(true),
  pushRatesEnabled: z.boolean().default(true),
  defaultCommissionRate: z.number().min(0).max(1).default(0),
  lastSuccessfulSyncAt: z.string().nullable().default(null),
  lastError: z.string().default("")
});

export const azRoomTypeMappingSchema = z.object({
  id: z.string(),
  channel: azChannelNameSchema,
  roomTypeId: z.string(),
  roomTypeLabel: z.string(),
  unitCount: z.number().int().positive(),
  externalRoomTypeId: z.string(),
  externalRoomTypeName: z.string(),
  syncEnabled: z.boolean().default(true)
});

export const azRatePlanMappingSchema = z.object({
  id: z.string(),
  channel: azChannelNameSchema,
  roomTypeId: z.string(),
  ratePlanCode: z.string(),
  ratePlanName: z.string(),
  mealPlan: z.string().default("room_only"),
  cancellationPolicy: z.string().default("Flexible"),
  externalRatePlanId: z.string(),
  syncEnabled: z.boolean().default(true),
  baseRate: z.number().nonnegative().default(0)
});

export const azChannelSyncTaskSchema = z.object({
  id: z.string(),
  channel: azChannelNameSchema,
  action: azChannelSyncActionSchema,
  scope: z.enum(["all", "room_type", "reservation"]).default("all"),
  roomTypeId: z.string().nullable().default(null),
  reservationId: z.string().nullable().default(null),
  status: azChannelTaskStatusSchema,
  queuedAt: z.string(),
  startedAt: z.string().nullable().default(null),
  finishedAt: z.string().nullable().default(null),
  processedItems: z.number().int().nonnegative().default(0),
  message: z.string().default(""),
  correlationId: z.string().default("")
});

export const azChannelMessageLogSchema = z.object({
  id: z.string(),
  channel: azChannelNameSchema,
  direction: azChannelMessageDirectionSchema,
  type: azChannelMessageTypeSchema,
  status: z.enum(["pending", "success", "failed"]).default("success"),
  createdAt: z.string(),
  relatedRoomTypeId: z.string().nullable().default(null),
  relatedReservationId: z.string().nullable().default(null),
  externalBookingId: z.string().default(""),
  payloadSummary: z.string().default(""),
  correlationId: z.string().default("")
});

export const azBookingSourceMetricSchema = z.object({
  source: z.enum(["direct", "ota", "phone", "walk_in", "partner"]),
  reservations: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  commissionCost: z.number().nonnegative()
});

export const azDirectAvailabilityRequestSchema = z.object({
  checkInDate: z.string().min(10),
  checkOutDate: z.string().min(10),
  adults: z.number().int().positive().default(1),
  children: z.number().int().min(0).default(0),
  roomTypeId: z.string().optional(),
  promoCode: z.string().default("")
});

export const azDirectAvailabilityOptionSchema = z.object({
  roomTypeId: z.string(),
  roomTypeLabel: z.string(),
  availableUnits: z.number().int().nonnegative(),
  nightlyRate: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  depositAmount: z.number().nonnegative()
});

export const azDirectAvailabilityResponseSchema = z.object({
  propertyId: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  nights: z.number().int().positive(),
  options: z.array(azDirectAvailabilityOptionSchema)
});

export const azDirectQuoteRequestSchema = azDirectAvailabilityRequestSchema.extend({
  roomTypeId: z.string().min(1)
});

export const azDirectQuoteSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  roomTypeId: z.string(),
  roomTypeLabel: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  nights: z.number().int().positive(),
  nightlyRate: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  depositAmount: z.number().nonnegative(),
  promoCode: z.string().default(""),
  cancellationPolicy: z.string(),
  paymentDeadline: z.string(),
  expiresAt: z.string(),
  availableUnits: z.number().int().nonnegative()
});

export const azDirectProvisionalReservationRequestSchema = z.object({
  quoteId: z.string().min(1),
  guestName: z.string().min(2),
  guestPhone: z.string().default(""),
  guestEmail: z.string().default(""),
  notes: z.string().default("")
});

export const azDirectBookingConfirmationSchema = z.object({
  reservationId: z.string(),
  status: z.enum(["pending_confirmation", "confirmed"]),
  totalAmount: z.number().nonnegative(),
  balanceDue: z.number().nonnegative(),
  paymentLinkId: z.string().nullable(),
  paymentLinkUrl: z.string().nullable(),
  expiresAt: z.string().nullable(),
  source: z.literal("direct")
});

export const azChannelBookingIngestSchema = z.object({
  channel: azChannelNameSchema,
  externalBookingId: z.string().min(2),
  roomTypeId: z.string().min(1),
  guestName: z.string().min(2),
  guestPhone: z.string().default(""),
  guestEmail: z.string().default(""),
  checkInDate: z.string().min(10),
  checkOutDate: z.string().min(10),
  totalAmount: z.number().nonnegative(),
  adultCount: z.number().int().positive().default(1),
  childCount: z.number().int().min(0).default(0),
  commissionRate: z.number().min(0).max(1).default(0.15),
  partnerName: z.string().default(""),
  status: azBookingStatusSchema.default("confirmed")
});

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
  rooms: z.array(azChannelRoomViewSchema),
  accounts: z.array(azDistributionAccountSchema).default([]),
  roomTypeMappings: z.array(azRoomTypeMappingSchema).default([]),
  ratePlanMappings: z.array(azRatePlanMappingSchema).default([]),
  sourceMetrics: z.array(azBookingSourceMetricSchema).default([]),
  recentTasks: z.array(azChannelSyncTaskSchema).default([]),
  messageLog: z.array(azChannelMessageLogSchema).default([]),
  directBookingSummary: z.object({
    directShareRevenue: z.number().min(0).max(100),
    pendingPaymentLinks: z.number().int().nonnegative(),
    provisionalReservations: z.number().int().nonnegative()
  }).default({
    directShareRevenue: 0,
    pendingPaymentLinks: 0,
    provisionalReservations: 0
  })
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

export const azDirectQuoteListSchema = z.array(azDirectQuoteSchema);

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
export type AzChannelAccountStatus = z.infer<typeof azChannelAccountStatusSchema>;
export type AzChannelTaskStatus = z.infer<typeof azChannelTaskStatusSchema>;
export type AzChannelMessageDirection = z.infer<typeof azChannelMessageDirectionSchema>;
export type AzChannelMessageType = z.infer<typeof azChannelMessageTypeSchema>;
export type AzDistributionAccount = z.infer<typeof azDistributionAccountSchema>;
export type AzRoomTypeMapping = z.infer<typeof azRoomTypeMappingSchema>;
export type AzRatePlanMapping = z.infer<typeof azRatePlanMappingSchema>;
export type AzChannelSyncTask = z.infer<typeof azChannelSyncTaskSchema>;
export type AzChannelMessageLog = z.infer<typeof azChannelMessageLogSchema>;
export type AzBookingSourceMetric = z.infer<typeof azBookingSourceMetricSchema>;
export type AzChannelRoomSync = z.infer<typeof azChannelRoomSyncSchema>;
export type AzChannelRoomView = z.infer<typeof azChannelRoomViewSchema>;
export type AzChannelDashboard = z.infer<typeof azChannelDashboardSchema>;
export type AzChannelSyncRequest = z.infer<typeof azChannelSyncRequestSchema>;
export type AzChannelSyncResult = z.infer<typeof azChannelSyncResultSchema>;
export type AzChannelSyncRecord = z.infer<typeof azChannelSyncRecordSchema>;
export type AzDirectAvailabilityRequest = z.infer<typeof azDirectAvailabilityRequestSchema>;
export type AzDirectAvailabilityOption = z.infer<typeof azDirectAvailabilityOptionSchema>;
export type AzDirectAvailabilityResponse = z.infer<typeof azDirectAvailabilityResponseSchema>;
export type AzDirectQuoteRequest = z.infer<typeof azDirectQuoteRequestSchema>;
export type AzDirectQuote = z.infer<typeof azDirectQuoteSchema>;
export type AzDirectProvisionalReservationRequest = z.infer<typeof azDirectProvisionalReservationRequestSchema>;
export type AzDirectBookingConfirmation = z.infer<typeof azDirectBookingConfirmationSchema>;
export type AzChannelBookingIngest = z.infer<typeof azChannelBookingIngestSchema>;
