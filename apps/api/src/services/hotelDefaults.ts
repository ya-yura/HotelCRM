import {
  createAzHotelCoreSeeds
} from "@hotel-crm/shared/features/azhotel_core";
import type { ComplianceSubmission } from "@hotel-crm/shared/compliance";
import { propertySummarySchema, type PropertySummary, type PropertyType } from "@hotel-crm/shared/properties";
import { createPinHint, hashSecret } from "../lib/credentials";
import type { PropertyScoped, HotelData } from "./hotelDataTypes";

export const schemaVersion = 6;
export const demoPropertyId = "prop_demo_1";
export const hostelPropertyId = "prop_hostel_1";
export const glampPropertyId = "prop_glamp_1";

const azSeeds = [
  createAzHotelCoreSeeds(demoPropertyId),
  createAzHotelCoreSeeds(hostelPropertyId),
  createAzHotelCoreSeeds(glampPropertyId)
];

function buildProperty(input: {
  id: string;
  name: string;
  city: string;
  timezone: string;
  currency: string;
  address: string;
  propertyType: PropertyType;
  legalEntityName?: string;
  taxId?: string;
  registrationNumber?: string;
}) {
  return propertySummarySchema.parse({
    id: input.id,
    name: input.name,
    city: input.city,
    timezone: input.timezone,
    currency: input.currency,
    address: input.address,
    active: true,
    propertyType: input.propertyType,
    legalInfo: {
      legalEntityName: input.legalEntityName ?? input.name,
      taxId: input.taxId ?? "",
      registrationNumber: input.registrationNumber ?? "",
      vatRate: "none"
    },
    notificationSettings: {
      newReservationPush: true,
      arrivalReminderPush: true,
      housekeepingAlerts: true,
      financeAlerts: true
    },
    operationSettings: {
      defaultCheckInTime: "14:00",
      defaultCheckOutTime: "12:00",
      housekeepingStartTime: "09:00",
      housekeepingEndTime: "18:00",
      sharedDeviceMode: true
    }
  });
}

function buildUser(input: {
  id: string;
  propertyId: string;
  name: string;
  email?: string;
  role: "owner" | "manager" | "frontdesk" | "housekeeping" | "maintenance" | "accountant";
  azAccessRole: "admin" | "staff";
  password?: string;
  pin?: string;
  quickUnlockEnabled?: boolean;
}) {
  return {
    id: input.id,
    propertyId: input.propertyId,
    name: input.name,
    email: input.email,
    role: input.role,
    azAccessRole: input.azAccessRole,
    passwordHash: input.password ? hashSecret(input.password) : undefined,
    pinHash: input.pin ? hashSecret(input.pin) : undefined,
    pinHint: input.pin ? createPinHint(input.pin) : "Password login only",
    quickUnlockEnabled: input.quickUnlockEnabled ?? true,
    active: true
  };
}

export const defaultData: HotelData = {
  schemaVersion,
  properties: [
    buildProperty({
      id: demoPropertyId,
      name: "Demo Hotel",
      city: "Москва",
      timezone: "Europe/Moscow",
      currency: "RUB",
      address: "Москва, Demo street 1",
      propertyType: "small_hotel",
      legalEntityName: "ООО Демо Отель"
    }),
    buildProperty({
      id: hostelPropertyId,
      name: "Northern Lights Hostel",
      city: "Казань",
      timezone: "Europe/Moscow",
      currency: "RUB",
      address: "Казань, ул. Баумана, 8",
      propertyType: "hostel",
      legalEntityName: "ИП Хостел Север"
    }),
    buildProperty({
      id: glampPropertyId,
      name: "Pine Wind Glamping",
      city: "Тверь",
      timezone: "Europe/Moscow",
      currency: "RUB",
      address: "Тверская область, берег озера",
      propertyType: "glamping",
      legalEntityName: "ООО Пайн Винд"
    })
  ],
  users: [
    buildUser({
      id: "user_owner",
      propertyId: demoPropertyId,
      name: "Elena Owner",
      email: "owner@demo.hotel",
      role: "owner",
      azAccessRole: "admin",
      password: "owner123",
      pin: "1111"
    }),
    buildUser({
      id: "user_manager",
      propertyId: demoPropertyId,
      name: "Daria Manager",
      email: "manager@demo.hotel",
      role: "manager",
      azAccessRole: "admin",
      pin: "1212"
    }),
    buildUser({
      id: "user_frontdesk",
      propertyId: demoPropertyId,
      name: "Maksim Front Desk",
      role: "frontdesk",
      azAccessRole: "staff",
      pin: "2222"
    }),
    buildUser({
      id: "user_housekeeping",
      propertyId: demoPropertyId,
      name: "Olga Housekeeping",
      role: "housekeeping",
      azAccessRole: "staff",
      pin: "3333"
    }),
    buildUser({
      id: "user_maintenance",
      propertyId: demoPropertyId,
      name: "Roman Maintenance",
      role: "maintenance",
      azAccessRole: "staff",
      pin: "3434",
      quickUnlockEnabled: false
    }),
    buildUser({
      id: "user_accountant",
      propertyId: demoPropertyId,
      name: "Irina Accountant",
      role: "accountant",
      azAccessRole: "staff",
      pin: "4444",
      quickUnlockEnabled: false
    }),
    buildUser({
      id: "user_hostel_owner",
      propertyId: hostelPropertyId,
      name: "Artem Hostel Owner",
      email: "owner@hostel.demo",
      role: "owner",
      azAccessRole: "admin",
      password: "hostel123",
      pin: "5555"
    }),
    buildUser({
      id: "user_glamp_owner",
      propertyId: glampPropertyId,
      name: "Vera Glamp Owner",
      email: "owner@glamp.demo",
      role: "owner",
      azAccessRole: "admin",
      password: "glamp123",
      pin: "6666"
    })
  ],
  authSessions: [],
  guests: [
    { propertyId: demoPropertyId, id: "guest_demo_anna", fullName: "Anna Petrova", phone: "+79990000001", email: "anna@example.com", birthDate: "", notes: "Prefers quiet room", preferences: ["quiet_room"], stayHistory: ["resv_demo_1"], mergedGuestIds: [], mergedIntoGuestId: null },
    { propertyId: hostelPropertyId, id: "guest_hostel_oleg", fullName: "Oleg Sidorov", phone: "+79991111111", email: "", birthDate: "", notes: "", preferences: [], stayHistory: ["resv_hostel_1"], mergedGuestIds: [], mergedIntoGuestId: null },
    { propertyId: glampPropertyId, id: "guest_glamp_maria", fullName: "Maria Volkova", phone: "+79992222222", email: "maria@example.com", birthDate: "", notes: "Needs late arrival instructions", preferences: ["late_arrival"], stayHistory: ["resv_glamp_1"], mergedGuestIds: [], mergedIntoGuestId: null }
  ],
  reservations: [
    { propertyId: demoPropertyId, id: "resv_demo_1", guestId: "guest_demo_anna", guestName: "Anna Petrova", guestPhone: "+79990000001", guestEmail: "anna@example.com", roomLabel: "203", roomTypeId: "double", checkInDate: "2026-03-25", checkOutDate: "2026-03-28", status: "confirmed", source: "phone", totalAmount: 12000, paidAmount: 7500, balanceDue: 4500, notes: "Prefers quiet room", createdAt: "2026-03-20T09:00:00.000Z", updatedAt: "2026-03-25T09:00:00.000Z" },
    { propertyId: demoPropertyId, id: "resv_demo_2", guestName: "Sergey Ivanov", roomLabel: "UNASSIGNED", roomTypeId: "family", checkInDate: "2026-03-26", checkOutDate: "2026-03-29", status: "draft", source: "whatsapp", totalAmount: 9600, paidAmount: 0, balanceDue: 9600, depositRequired: 3000, notes: "Family arriving after lunch", createdAt: "2026-03-24T11:15:00.000Z", updatedAt: "2026-03-24T11:15:00.000Z" },
    { propertyId: hostelPropertyId, id: "resv_hostel_1", guestId: "guest_hostel_oleg", guestName: "Oleg Sidorov", guestPhone: "+79991111111", roomLabel: "B-12", roomTypeId: "dorm", checkInDate: "2026-03-27", checkOutDate: "2026-03-30", status: "confirmed", source: "walk_in", totalAmount: 2100, paidAmount: 0, balanceDue: 2100, createdAt: "2026-03-26T18:00:00.000Z", updatedAt: "2026-03-26T18:00:00.000Z" },
    { propertyId: glampPropertyId, id: "resv_glamp_1", guestId: "guest_glamp_maria", guestName: "Maria Volkova", guestPhone: "+79992222222", guestEmail: "maria@example.com", roomLabel: "A-Frame 2", roomTypeId: "a-frame", checkInDate: "2026-03-28", checkOutDate: "2026-03-31", status: "pending_confirmation", source: "ota", totalAmount: 7200, paidAmount: 3000, balanceDue: 4200, notes: "Needs heater check", createdAt: "2026-03-23T13:40:00.000Z", updatedAt: "2026-03-26T12:00:00.000Z" }
  ],
  rooms: [
    { propertyId: demoPropertyId, id: "room_101", number: "101", roomType: "Standard", unitKind: "room", status: "available", readiness: "clean", readinessLabel: "Готов", housekeepingNote: "Ready for check-in", nextAction: "Keep open for arrivals", occupancyLabel: "Free tonight", priority: "normal", floor: "1", zone: "Main", occupancyLimit: 2, amenities: ["wifi", "desk", "shower"], minibarEnabled: false, lastCleanedAt: "2026-03-25T09:10:00.000Z", nextArrivalLabel: "", outOfOrderReason: "", activeMaintenanceIncidentId: null, glampingMetadata: null },
    { propertyId: demoPropertyId, id: "room_118", number: "118", roomType: "Standard", unitKind: "room", status: "inspected", readiness: "inspected", readinessLabel: "Проверен", housekeepingNote: "Awaiting release after inspection", nextAction: "Approve room to available", occupancyLabel: "Inspection passed", priority: "normal", floor: "1", zone: "Main", occupancyLimit: 2, amenities: ["wifi", "tea", "shower"], minibarEnabled: true, lastCleanedAt: "2026-03-25T08:40:00.000Z", nextArrivalLabel: "Expected arrival after 16:00", outOfOrderReason: "", activeMaintenanceIncidentId: null, glampingMetadata: null },
    { propertyId: demoPropertyId, id: "room_203", number: "203", roomType: "Double", unitKind: "room", status: "dirty", readiness: "dirty", readinessLabel: "Грязный", housekeepingNote: "Checkout completed, cleaner needed", nextAction: "Start cleaning before 13:30 arrival", occupancyLabel: "Arrival due today", priority: "arrival_soon", floor: "2", zone: "Main", occupancyLimit: 2, amenities: ["wifi", "tv", "minibar"], minibarEnabled: true, lastCleanedAt: "2026-03-23T11:00:00.000Z", nextArrivalLabel: "Arrival due at 13:30", outOfOrderReason: "", activeMaintenanceIncidentId: null, glampingMetadata: null },
    { propertyId: demoPropertyId, id: "room_305", number: "305", roomType: "Family", unitKind: "room", status: "blocked_maintenance", readiness: "blocked", readinessLabel: "Заблокирован", housekeepingNote: "Bathroom leak reported", nextAction: "Keep blocked until inspection", occupancyLabel: "Unavailable", priority: "blocked", floor: "3", zone: "Family", occupancyLimit: 4, amenities: ["wifi", "kettle", "crib"], minibarEnabled: false, lastCleanedAt: "2026-03-22T09:30:00.000Z", nextArrivalLabel: "", outOfOrderReason: "Bathroom leak", activeMaintenanceIncidentId: "maint_room_305", glampingMetadata: null },
    { propertyId: hostelPropertyId, id: "room_b-12", number: "B-12", roomType: "Dorm Bed", unitKind: "bed", status: "reserved", readiness: "clean", readinessLabel: "Под заезд", housekeepingNote: "Reserved for late arrival", nextAction: "Keep bed assignment stable", occupancyLabel: "Guest arrives tonight", priority: "arrival_soon", floor: "2", zone: "Blue dorm", occupancyLimit: 1, amenities: ["locker", "reading_light"], minibarEnabled: false, lastCleanedAt: "2026-03-25T15:10:00.000Z", nextArrivalLabel: "Late arrival after 22:00", outOfOrderReason: "", activeMaintenanceIncidentId: null, glampingMetadata: null },
    { propertyId: hostelPropertyId, id: "room_b-14", number: "B-14", roomType: "Dorm Bed", unitKind: "bed", status: "available", readiness: "clean", readinessLabel: "Готов", housekeepingNote: "Ready", nextAction: "Can be sold tonight", occupancyLabel: "Free tonight", priority: "normal", floor: "2", zone: "Blue dorm", occupancyLimit: 1, amenities: ["locker", "reading_light"], minibarEnabled: false, lastCleanedAt: "2026-03-25T14:00:00.000Z", nextArrivalLabel: "", outOfOrderReason: "", activeMaintenanceIncidentId: null, glampingMetadata: null },
    { propertyId: glampPropertyId, id: "room_a-frame_1", number: "A-Frame 1", roomType: "A-Frame", unitKind: "glamp_unit", status: "available", readiness: "clean", readinessLabel: "Готов", housekeepingNote: "Cabin warmed up", nextAction: "Ready for direct booking", occupancyLabel: "Free tonight", priority: "normal", floor: "", zone: "Lake line", occupancyLimit: 3, amenities: ["heater", "firepit", "breakfast_basket"], minibarEnabled: true, lastCleanedAt: "2026-03-25T10:00:00.000Z", nextArrivalLabel: "", outOfOrderReason: "", activeMaintenanceIncidentId: null, glampingMetadata: { unitType: "A-frame", outdoorAreaLabel: "Private deck", heatingMode: "Electric heater", accessNotes: "500m from reception" } },
    { propertyId: glampPropertyId, id: "room_a-frame_2", number: "A-Frame 2", roomType: "A-Frame", unitKind: "glamp_unit", status: "reserved", readiness: "clean", readinessLabel: "Под заезд", housekeepingNote: "Awaiting guest confirmation", nextAction: "Hold until payment is completed", occupancyLabel: "Pending arrival", priority: "arrival_soon", floor: "", zone: "Lake line", occupancyLimit: 3, amenities: ["heater", "firepit", "breakfast_basket"], minibarEnabled: true, lastCleanedAt: "2026-03-24T18:00:00.000Z", nextArrivalLabel: "Arrival expected 16:00-18:00", outOfOrderReason: "", activeMaintenanceIncidentId: null, glampingMetadata: { unitType: "A-frame", outdoorAreaLabel: "Deck with chairs", heatingMode: "Electric heater", accessNotes: "Guest transfer may be required" } }
  ],
  housekeepingTasks: [
    { propertyId: demoPropertyId, id: "task_203_checkout", roomId: "room_203", roomNumber: "203", priority: "urgent", status: "queued", taskType: "checkout_clean", note: "Arrival due at 13:30", dueLabel: "Due before 13:00", assigneeName: "Olga Housekeeping", shiftLabel: "Morning shift", problemNote: "", requestedInspection: false, checklist: [{ label: "Bathroom reset", done: false }, { label: "Linens changed", done: false }, { label: "Mini-bar checked", done: false }], evidence: [], consumables: [{ id: "cons_task_203_water", item: "Water", quantity: 2, unitLabel: "btl", unitPrice: 120, postToFolio: false }], createdAt: "2026-03-25T11:45:00.000Z", updatedAt: "2026-03-25T11:45:00.000Z" },
    { propertyId: demoPropertyId, id: "task_118_inspection", roomId: "room_118", roomNumber: "118", priority: "normal", status: "in_progress", taskType: "inspection", note: "Cleaner reported minibar issue", dueLabel: "Inspect this shift", assigneeName: "Roman Maintenance", shiftLabel: "Day support", problemNote: "Door sensor on minibar sticks", requestedInspection: true, checklist: [{ label: "Verify minibar seal", done: false }, { label: "Photo evidence if broken", done: false }], evidence: [], consumables: [], createdAt: "2026-03-25T09:15:00.000Z", updatedAt: "2026-03-25T10:30:00.000Z" },
    { propertyId: glampPropertyId, id: "task_glamp_arrival", roomId: "room_a-frame_2", roomNumber: "A-Frame 2", priority: "normal", status: "queued", taskType: "manual_clean", note: "Check heater and welcome kit", dueLabel: "Before 16:00", assigneeName: "Field team", shiftLabel: "Arrival prep", problemNote: "", requestedInspection: false, checklist: [{ label: "Warm cabin before arrival", done: false }, { label: "Refill welcome basket", done: false }], evidence: [], consumables: [{ id: "cons_glamp_firewood", item: "Firewood kit", quantity: 1, unitLabel: "set", unitPrice: 600, postToFolio: true }], createdAt: "2026-03-26T07:00:00.000Z", updatedAt: "2026-03-26T07:00:00.000Z" }
  ],
  maintenanceIncidents: [
    { propertyId: demoPropertyId, id: "maint_room_305", roomId: "room_305", roomNumber: "305", title: "Bathroom leak", description: "Leak behind sink cabinet", priority: "high", status: "open", assignee: "Engineering", reportedBy: "Olga Housekeeping", locationLabel: "Bathroom sink", impact: "block_from_sale", roomBlocked: true, resolutionNote: "", linkedHousekeepingTaskId: null, evidence: [], createdAt: "2026-03-25T07:20:00.000Z", updatedAt: "2026-03-25T08:10:00.000Z", resolvedAt: null }
  ],
  folios: [
    { propertyId: demoPropertyId, reservationId: "resv_demo_1", guestName: "Anna Petrova", totalAmount: 12000, paidAmount: 7500, balanceDue: 4500, status: "partially_paid", pendingFiscalReceipts: 1, charges: [{ id: "charge_room_resv_demo_1", reservationId: "resv_demo_1", guestName: "Anna Petrova", type: "room", description: "Room charge", amount: 12000, postedAt: "2026-03-25T08:00:00.000Z", reason: "Base accommodation", correlationId: "folio_demo_1" }], payments: [{ id: "pay_demo_1", reservationId: "resv_demo_1", guestName: "Anna Petrova", amount: 7500, method: "card", provider: "manual", kind: "deposit", receivedAt: "2026-03-25T09:00:00.000Z", note: "Deposit at arrival", reason: "Arrival deposit", correlationId: "deposit_demo_1", paymentLinkId: null, fiscalization: { provider: "atol", status: "sent", receiptNumber: "atol_sale_demo_1", requestedAt: "2026-03-25T09:00:00.000Z", acknowledgedAt: null, errorMessage: "" } }], lines: [], paymentLinks: [] },
    { propertyId: demoPropertyId, reservationId: "resv_demo_2", guestName: "Sergey Ivanov", totalAmount: 9600, paidAmount: 0, balanceDue: 9600, status: "unpaid", pendingFiscalReceipts: 0, charges: [{ id: "charge_room_resv_demo_2", reservationId: "resv_demo_2", guestName: "Sergey Ivanov", type: "room", description: "Room charge", amount: 9600, postedAt: "2026-03-25T08:00:00.000Z", reason: "Base accommodation", correlationId: "folio_demo_2" }], payments: [], lines: [], paymentLinks: [{ id: "plink_sbp_demo_2", reservationId: "resv_demo_2", guestName: "Sergey Ivanov", amount: 3000, method: "sbp", provider: "sbp", url: "https://payments.demo.local/sbp/resv_demo_2?amount=3000", status: "sent", createdAt: "2026-03-25T09:30:00.000Z", expiresAt: "2026-03-26T09:30:00.000Z", lastSentAt: "2026-03-25T09:30:00.000Z", note: "Deposit request" }] },
    { propertyId: hostelPropertyId, reservationId: "resv_hostel_1", guestName: "Oleg Sidorov", totalAmount: 2100, paidAmount: 0, balanceDue: 2100, status: "unpaid", pendingFiscalReceipts: 0, charges: [], payments: [], lines: [], paymentLinks: [] },
    { propertyId: glampPropertyId, reservationId: "resv_glamp_1", guestName: "Maria Volkova", totalAmount: 7200, paidAmount: 3000, balanceDue: 4200, status: "partially_paid", pendingFiscalReceipts: 1, charges: [], payments: [{ id: "pay_glamp_1", reservationId: "resv_glamp_1", guestName: "Maria Volkova", amount: 3000, method: "bank_transfer", provider: "manual", kind: "payment", receivedAt: "2026-03-26T12:00:00.000Z", note: "Advance payment", reason: "Advance payment", correlationId: "advance_glamp_1", paymentLinkId: null, fiscalization: { provider: "atol", status: "pending", receiptNumber: "", requestedAt: "2026-03-26T12:00:00.000Z", acknowledgedAt: null, errorMessage: "" } }], lines: [], paymentLinks: [] }
  ],
  payments: [
    { propertyId: demoPropertyId, id: "pay_demo_1", reservationId: "resv_demo_1", guestName: "Anna Petrova", amount: 7500, method: "card", provider: "manual", kind: "deposit", receivedAt: "2026-03-25T09:00:00.000Z", note: "Deposit at arrival", reason: "Arrival deposit", correlationId: "deposit_demo_1", paymentLinkId: null, fiscalization: { provider: "atol", status: "sent", receiptNumber: "atol_sale_demo_1", requestedAt: "2026-03-25T09:00:00.000Z", acknowledgedAt: null, errorMessage: "" } },
    { propertyId: glampPropertyId, id: "pay_glamp_1", reservationId: "resv_glamp_1", guestName: "Maria Volkova", amount: 3000, method: "bank_transfer", provider: "manual", kind: "payment", receivedAt: "2026-03-26T12:00:00.000Z", note: "Advance payment", reason: "Advance payment", correlationId: "advance_glamp_1", paymentLinkId: null, fiscalization: { provider: "atol", status: "pending", receiptNumber: "", requestedAt: "2026-03-26T12:00:00.000Z", acknowledgedAt: null, errorMessage: "" } }
  ],
  stays: [],
  auditLogs: [],
  syncQueue: [
    { propertyId: demoPropertyId, id: "sync_1", entityType: "reservation", entityId: "resv_demo_2", operation: "create", action: "create_reservation", payloadJson: "{\"idempotencyKey\":\"demo_2\"}", localVersion: 1, status: "queued", summary: "Reservation for Sergey Ivanov waiting for upload", lastAttemptLabel: "Not sent yet", retryCount: 0 },
    { propertyId: demoPropertyId, id: "sync_2", entityType: "room", entityId: "room_203", operation: "update", action: "update_room_status", payloadJson: "{\"status\":\"dirty\"}", localVersion: 4, status: "failed_conflict", summary: "Room 203 marked dirty locally", lastAttemptLabel: "Conflict detected 2 min ago", retryCount: 1 }
  ],
  syncConflicts: [
    { propertyId: demoPropertyId, id: "conflict_room_203", entityType: "room", entityId: "room_203", localSummary: "Local device says room is dirty after checkout", serverSummary: "Server says room is already cleaning by another user", recommendedAction: "Keep server state and re-open cleaning task" }
  ],
  assistantItems: [],
  notificationDeliveries: [],
  complianceSubmissions: [],
  backgroundJobs: [
    { id: "job_daily_summary_demo", propertyId: demoPropertyId, jobType: "daily_summary", payloadJson: "{\"propertyId\":\"prop_demo_1\"}", status: "queued", runAt: "2026-03-26T05:00:00.000Z", attempts: 0, lastError: "" }
  ],
  azRooms: azSeeds.flatMap((seed) => seed.rooms),
  azBookings: azSeeds.flatMap((seed) => seed.bookings),
  azGuests: azSeeds.flatMap((seed) => seed.guests),
  azHousekeepingTasks: azSeeds.flatMap((seed) => seed.housekeepingTasks),
  azReportData: azSeeds.flatMap((seed) => seed.reportData),
  azChannelSyncRecords: []
};

export function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaultData)) as HotelData;
}

function withPropertyId<T extends { propertyId?: string }>(item: T, propertyId: string): T & { propertyId: string } {
  return {
    ...item,
    propertyId: item.propertyId ?? propertyId
  };
}

function normalizeProperty(item: Partial<PropertySummary>, fallback: PropertySummary) {
  return propertySummarySchema.parse({
    ...fallback,
    ...item,
    legalInfo: {
      ...fallback.legalInfo,
      ...(item.legalInfo ?? {})
    },
    notificationSettings: {
      ...fallback.notificationSettings,
      ...(item.notificationSettings ?? {})
    },
    operationSettings: {
      ...fallback.operationSettings,
      ...(item.operationSettings ?? {})
    }
  });
}

export function hydrateData(raw: Partial<HotelData> | null | undefined): HotelData {
  const defaults = cloneDefaults();
  if (!raw) {
    return defaults;
  }

  const fallbackProperty = raw.properties?.[0] ?? defaults.properties[0];
  const fallbackPropertyId = fallbackProperty.id;
  const fallbackPropertyName = fallbackProperty.name;

  return {
    ...defaults,
    ...raw,
    schemaVersion,
    properties: (raw.properties ?? defaults.properties).map((property, index) =>
      normalizeProperty(property, defaults.properties[index] ?? defaults.properties[0])
    ),
    users: (raw.users ?? defaults.users).map((user) => ({
      ...user,
      propertyId: user.propertyId ?? fallbackPropertyId,
      azAccessRole: user.azAccessRole ?? (user.role === "owner" ? "admin" : "staff"),
      active: user.active ?? true,
      email: user.email ?? "",
      pinHint: user.pinHint ?? (user.pin ? createPinHint(user.pin) : "Password login only"),
      quickUnlockEnabled: user.quickUnlockEnabled ?? true
    })),
    authSessions: (raw.authSessions ?? defaults.authSessions).map((session) => ({
      ...session,
      propertyId: session.propertyId ?? fallbackPropertyId,
      propertyName: session.propertyName ?? fallbackPropertyName,
      azAccessRole: session.azAccessRole ?? (session.role === "owner" ? "admin" : "staff"),
      authMethod: session.authMethod ?? "password",
      deviceLabel: session.deviceLabel ?? "Unknown device",
      quickUnlockEnabled: session.quickUnlockEnabled ?? true,
      recentAuthAt: session.recentAuthAt ?? session.createdAt
    })),
    guests: (raw.guests ?? defaults.guests).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      phone: item.phone ?? "",
      email: item.email ?? "",
      birthDate: item.birthDate ?? "",
      notes: item.notes ?? "",
      preferences: item.preferences ?? [],
      stayHistory: item.stayHistory ?? [],
      mergedGuestIds: item.mergedGuestIds ?? [],
      mergedIntoGuestId: item.mergedIntoGuestId ?? null
    })),
    reservations: (raw.reservations ?? defaults.reservations).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      guestId:
        item.guestId ??
        (raw.guests ?? defaults.guests).find(
          (guest) =>
            (guest.propertyId ?? fallbackPropertyId) === (item.propertyId ?? fallbackPropertyId) &&
            guest.fullName === item.guestName &&
            !guest.mergedIntoGuestId
        )?.id,
      source: item.source ?? "manual",
      totalAmount: item.totalAmount ?? item.balanceDue ?? 0,
      paidAmount: item.paidAmount ?? Math.max((item.totalAmount ?? item.balanceDue ?? 0) - (item.balanceDue ?? 0), 0),
      depositRequired: item.depositRequired ?? 0,
      depositAmount: item.depositAmount ?? 0,
      createdAt: item.createdAt ?? new Date().toISOString(),
      updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
      mergedReservationIds: item.mergedReservationIds ?? [],
      paymentLinkSentAt: item.paymentLinkSentAt ?? null
    })),
    rooms: (raw.rooms ?? defaults.rooms).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      unitKind: item.unitKind ?? "room",
      readiness: item.readiness ?? (item.status === "dirty" || item.status === "cleaning" ? "dirty" : item.status === "inspected" ? "inspected" : item.status === "occupied" ? "occupied" : item.status === "blocked_maintenance" ? "blocked" : item.status === "out_of_service" ? "maintenance_required" : "clean"),
      readinessLabel: item.readinessLabel ?? "Готов",
      floor: item.floor ?? "",
      zone: item.zone ?? "",
      occupancyLimit: item.occupancyLimit ?? 2,
      amenities: item.amenities ?? [],
      minibarEnabled: item.minibarEnabled ?? false,
      lastCleanedAt: item.lastCleanedAt ?? null,
      nextArrivalLabel: item.nextArrivalLabel ?? "",
      outOfOrderReason: item.outOfOrderReason ?? "",
      activeMaintenanceIncidentId: item.activeMaintenanceIncidentId ?? null,
      glampingMetadata: item.glampingMetadata ?? null
    })),
    housekeepingTasks: (raw.housekeepingTasks ?? defaults.housekeepingTasks).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      assigneeName: item.assigneeName ?? "",
      shiftLabel: item.shiftLabel ?? "",
      problemNote: item.problemNote ?? "",
      requestedInspection: item.requestedInspection ?? false,
      checklist: item.checklist ?? [],
      evidence: item.evidence ?? [],
      consumables: item.consumables ?? [],
      createdAt: item.createdAt ?? new Date().toISOString(),
      updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString()
    })),
    maintenanceIncidents: (raw.maintenanceIncidents ?? defaults.maintenanceIncidents).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      reportedBy: item.reportedBy ?? "",
      locationLabel: item.locationLabel ?? "",
      impact: item.impact ?? "block_from_sale",
      resolutionNote: item.resolutionNote ?? "",
      linkedHousekeepingTaskId: item.linkedHousekeepingTaskId ?? null,
      evidence: item.evidence ?? [],
      updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString()
    })),
    folios: (raw.folios ?? defaults.folios).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      pendingFiscalReceipts: item.pendingFiscalReceipts ?? 0,
      charges: (item.charges ?? []).map((charge) => ({
        ...charge,
        reason: charge.reason ?? "",
        correlationId: charge.correlationId ?? ""
      })),
      payments: (item.payments ?? []).map((payment) => ({
        ...payment,
        provider: payment.provider ?? "manual",
        kind: payment.kind ?? (payment.amount < 0 ? "refund" : "payment"),
        reason: payment.reason ?? payment.note ?? "",
        correlationId: payment.correlationId ?? "",
        paymentLinkId: payment.paymentLinkId ?? null,
        fiscalization: {
          provider: payment.fiscalization?.provider ?? "none",
          status: payment.fiscalization?.status ?? "not_required",
          receiptNumber: payment.fiscalization?.receiptNumber ?? "",
          requestedAt: payment.fiscalization?.requestedAt ?? null,
          acknowledgedAt: payment.fiscalization?.acknowledgedAt ?? null,
          errorMessage: payment.fiscalization?.errorMessage ?? ""
        }
      })),
      lines: item.lines ?? [],
      paymentLinks: (item.paymentLinks ?? []).map((link) => ({
        ...link,
        provider: link.provider ?? (link.method === "sbp" ? "sbp" : link.method),
        status: link.status ?? "draft",
        expiresAt: link.expiresAt ?? null,
        lastSentAt: link.lastSentAt ?? null,
        note: link.note ?? ""
      }))
    })),
    payments: (raw.payments ?? defaults.payments).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      provider: item.provider ?? "manual",
      kind: item.kind ?? (item.amount < 0 ? "refund" : "payment"),
      reason: item.reason ?? item.note ?? "",
      correlationId: item.correlationId ?? "",
      paymentLinkId: item.paymentLinkId ?? null,
      fiscalization: {
        provider: item.fiscalization?.provider ?? "none",
        status: item.fiscalization?.status ?? "not_required",
        receiptNumber: item.fiscalization?.receiptNumber ?? "",
        requestedAt: item.fiscalization?.requestedAt ?? null,
        acknowledgedAt: item.fiscalization?.acknowledgedAt ?? null,
        errorMessage: item.fiscalization?.errorMessage ?? ""
      }
    })),
    stays: (raw.stays ?? defaults.stays).map((item) => withPropertyId(item, fallbackPropertyId)),
    auditLogs: (raw.auditLogs ?? defaults.auditLogs).map((item) => ({
      ...withPropertyId(item, fallbackPropertyId),
      actor: item.actor,
      correlationId: item.correlationId
    })),
    syncQueue: (raw.syncQueue ?? defaults.syncQueue).map((item) => withPropertyId(item, fallbackPropertyId)),
    syncConflicts: (raw.syncConflicts ?? defaults.syncConflicts).map((item) => withPropertyId(item, fallbackPropertyId)),
    assistantItems: raw.assistantItems ?? defaults.assistantItems,
    notificationDeliveries: (raw.notificationDeliveries ?? defaults.notificationDeliveries).map((item) => ({ ...item, propertyId: item.propertyId ?? fallbackPropertyId })),
    complianceSubmissions: (raw.complianceSubmissions ?? defaults.complianceSubmissions).map((item: ComplianceSubmission) => ({ ...item, propertyId: item.propertyId ?? fallbackPropertyId })),
    backgroundJobs: raw.backgroundJobs ?? defaults.backgroundJobs,
    azRooms: (raw.azRooms ?? defaults.azRooms).map((item) => ({ ...withPropertyId(item, fallbackPropertyId), priceRules: item.priceRules ?? [] })),
    azBookings: (raw.azBookings ?? defaults.azBookings).map((item) => ({ ...withPropertyId(item, fallbackPropertyId), services: item.services ?? [] })),
    azGuests: (raw.azGuests ?? defaults.azGuests).map((item) => ({ ...withPropertyId(item, fallbackPropertyId), history: item.history ?? [], contact: item.contact ?? { phone: "", email: "" } })),
    azHousekeepingTasks: (raw.azHousekeepingTasks ?? defaults.azHousekeepingTasks).map((item) => withPropertyId(item, fallbackPropertyId)),
    azReportData: (raw.azReportData ?? defaults.azReportData).map((item) => ({ ...withPropertyId(item, fallbackPropertyId), channels: item.channels ?? [] })),
    azChannelSyncRecords: (raw.azChannelSyncRecords ?? defaults.azChannelSyncRecords).map((item) => withPropertyId(item, fallbackPropertyId))
  };
}
