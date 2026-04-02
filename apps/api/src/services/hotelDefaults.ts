import {
  createAzHotelCoreSeeds
} from "@hotel-crm/shared/features/azhotel_core";
import type { ComplianceSubmission } from "@hotel-crm/shared/compliance";
import type { PropertyScoped, HotelData } from "./hotelDataTypes";

export const schemaVersion = 3;
export const demoPropertyId = "prop_demo_1";
export const hostelPropertyId = "prop_hostel_1";
export const glampPropertyId = "prop_glamp_1";

const azSeeds = [
  createAzHotelCoreSeeds(demoPropertyId),
  createAzHotelCoreSeeds(hostelPropertyId),
  createAzHotelCoreSeeds(glampPropertyId)
];

export const defaultData: HotelData = {
  schemaVersion,
  properties: [
    { id: demoPropertyId, name: "Demo Hotel", timezone: "Europe/Moscow", currency: "RUB", address: "Москва, Demo street 1", active: true },
    { id: hostelPropertyId, name: "Northern Lights Hostel", timezone: "Europe/Moscow", currency: "RUB", address: "Казань, ул. Баумана, 8", active: true },
    { id: glampPropertyId, name: "Pine Wind Glamping", timezone: "Europe/Moscow", currency: "RUB", address: "Тверская область, берег озера", active: true }
  ],
  users: [
    { id: "user_owner", propertyId: demoPropertyId, name: "Elena Owner", email: "owner@demo.hotel", role: "owner", azAccessRole: "admin", password: "owner123", pin: "1111", active: true },
    { id: "user_frontdesk", propertyId: demoPropertyId, name: "Maksim Front Desk", role: "frontdesk", azAccessRole: "staff", pin: "2222", active: true },
    { id: "user_housekeeping", propertyId: demoPropertyId, name: "Olga Housekeeping", role: "housekeeping", azAccessRole: "staff", pin: "3333", active: true },
    { id: "user_accountant", propertyId: demoPropertyId, name: "Irina Accountant", role: "accountant", azAccessRole: "staff", pin: "4444", active: true },
    { id: "user_hostel_owner", propertyId: hostelPropertyId, name: "Artem Hostel Owner", email: "owner@hostel.demo", role: "owner", azAccessRole: "admin", password: "hostel123", pin: "5555", active: true },
    { id: "user_glamp_owner", propertyId: glampPropertyId, name: "Vera Glamp Owner", email: "owner@glamp.demo", role: "owner", azAccessRole: "admin", password: "glamp123", pin: "6666", active: true }
  ],
  authSessions: [],
  guests: [
    { propertyId: demoPropertyId, id: "guest_demo_anna", fullName: "Anna Petrova", phone: "+79990000001", email: "anna@example.com", birthDate: "", notes: "Prefers quiet room", preferences: ["quiet_room"], stayHistory: ["resv_demo_1"], mergedIntoGuestId: null },
    { propertyId: hostelPropertyId, id: "guest_hostel_oleg", fullName: "Oleg Sidorov", phone: "+79991111111", email: "", birthDate: "", notes: "", preferences: [], stayHistory: ["resv_hostel_1"], mergedIntoGuestId: null },
    { propertyId: glampPropertyId, id: "guest_glamp_maria", fullName: "Maria Volkova", phone: "+79992222222", email: "maria@example.com", birthDate: "", notes: "Needs late arrival instructions", preferences: ["late_arrival"], stayHistory: ["resv_glamp_1"], mergedIntoGuestId: null }
  ],
  reservations: [
    { propertyId: demoPropertyId, id: "resv_demo_1", guestName: "Anna Petrova", roomLabel: "203", checkInDate: "2026-03-25", checkOutDate: "2026-03-28", status: "confirmed", balanceDue: 4500 },
    { propertyId: demoPropertyId, id: "resv_demo_2", guestName: "Sergey Ivanov", roomLabel: "UNASSIGNED", checkInDate: "2026-03-26", checkOutDate: "2026-03-29", status: "draft", balanceDue: 9600 },
    { propertyId: hostelPropertyId, id: "resv_hostel_1", guestName: "Oleg Sidorov", roomLabel: "B-12", checkInDate: "2026-03-27", checkOutDate: "2026-03-30", status: "confirmed", balanceDue: 2100 },
    { propertyId: glampPropertyId, id: "resv_glamp_1", guestName: "Maria Volkova", roomLabel: "A-Frame 2", checkInDate: "2026-03-28", checkOutDate: "2026-03-31", status: "pending_confirmation", balanceDue: 7200 }
  ],
  rooms: [
    { propertyId: demoPropertyId, id: "room_101", number: "101", roomType: "Standard", status: "available", housekeepingNote: "Ready for check-in", nextAction: "Keep open for arrivals", occupancyLabel: "Free tonight", priority: "normal" },
    { propertyId: demoPropertyId, id: "room_118", number: "118", roomType: "Standard", status: "inspected", housekeepingNote: "Awaiting release after inspection", nextAction: "Approve room to available", occupancyLabel: "Inspection passed", priority: "normal" },
    { propertyId: demoPropertyId, id: "room_203", number: "203", roomType: "Double", status: "dirty", housekeepingNote: "Checkout completed, cleaner needed", nextAction: "Start cleaning before 13:30 arrival", occupancyLabel: "Arrival due today", priority: "arrival_soon" },
    { propertyId: demoPropertyId, id: "room_305", number: "305", roomType: "Family", status: "blocked_maintenance", housekeepingNote: "Bathroom leak reported", nextAction: "Keep blocked until inspection", occupancyLabel: "Unavailable", priority: "blocked" },
    { propertyId: hostelPropertyId, id: "room_b-12", number: "B-12", roomType: "Dorm Bed", status: "reserved", housekeepingNote: "Reserved for late arrival", nextAction: "Keep bed assignment stable", occupancyLabel: "Guest arrives tonight", priority: "arrival_soon" },
    { propertyId: hostelPropertyId, id: "room_b-14", number: "B-14", roomType: "Dorm Bed", status: "available", housekeepingNote: "Ready", nextAction: "Can be sold tonight", occupancyLabel: "Free tonight", priority: "normal" },
    { propertyId: glampPropertyId, id: "room_a-frame_1", number: "A-Frame 1", roomType: "A-Frame", status: "available", housekeepingNote: "Cabin warmed up", nextAction: "Ready for direct booking", occupancyLabel: "Free tonight", priority: "normal" },
    { propertyId: glampPropertyId, id: "room_a-frame_2", number: "A-Frame 2", roomType: "A-Frame", status: "reserved", housekeepingNote: "Awaiting guest confirmation", nextAction: "Hold until payment is completed", occupancyLabel: "Pending arrival", priority: "arrival_soon" }
  ],
  housekeepingTasks: [
    { propertyId: demoPropertyId, id: "task_203_checkout", roomId: "room_203", roomNumber: "203", priority: "urgent", status: "queued", taskType: "checkout_clean", note: "Arrival due at 13:30", dueLabel: "Due before 13:00" },
    { propertyId: demoPropertyId, id: "task_118_inspection", roomId: "room_118", roomNumber: "118", priority: "normal", status: "in_progress", taskType: "inspection", note: "Cleaner reported minibar issue", dueLabel: "Inspect this shift" },
    { propertyId: glampPropertyId, id: "task_glamp_arrival", roomId: "room_a-frame_2", roomNumber: "A-Frame 2", priority: "normal", status: "queued", taskType: "manual_clean", note: "Check heater and welcome kit", dueLabel: "Before 16:00" }
  ],
  maintenanceIncidents: [
    { propertyId: demoPropertyId, id: "maint_room_305", roomId: "room_305", roomNumber: "305", title: "Bathroom leak", description: "Leak behind sink cabinet", priority: "high", status: "open", assignee: "Engineering", roomBlocked: true, createdAt: "2026-03-25T07:20:00.000Z", resolvedAt: null }
  ],
  folios: [
    { propertyId: demoPropertyId, reservationId: "resv_demo_1", guestName: "Anna Petrova", totalAmount: 12000, paidAmount: 7500, balanceDue: 4500, status: "partially_paid", charges: [{ id: "charge_room_resv_demo_1", reservationId: "resv_demo_1", guestName: "Anna Petrova", type: "room", description: "Room charge", amount: 12000, postedAt: "2026-03-25T08:00:00.000Z" }], payments: [] },
    { propertyId: demoPropertyId, reservationId: "resv_demo_2", guestName: "Sergey Ivanov", totalAmount: 9600, paidAmount: 0, balanceDue: 9600, status: "unpaid", charges: [{ id: "charge_room_resv_demo_2", reservationId: "resv_demo_2", guestName: "Sergey Ivanov", type: "room", description: "Room charge", amount: 9600, postedAt: "2026-03-25T08:00:00.000Z" }], payments: [] },
    { propertyId: hostelPropertyId, reservationId: "resv_hostel_1", guestName: "Oleg Sidorov", totalAmount: 2100, paidAmount: 0, balanceDue: 2100, status: "unpaid", charges: [], payments: [] },
    { propertyId: glampPropertyId, reservationId: "resv_glamp_1", guestName: "Maria Volkova", totalAmount: 7200, paidAmount: 3000, balanceDue: 4200, status: "partially_paid", charges: [], payments: [] }
  ],
  payments: [
    { propertyId: demoPropertyId, id: "pay_demo_1", reservationId: "resv_demo_1", guestName: "Anna Petrova", amount: 7500, method: "card", receivedAt: "2026-03-25T09:00:00.000Z", note: "Deposit at arrival" },
    { propertyId: glampPropertyId, id: "pay_glamp_1", reservationId: "resv_glamp_1", guestName: "Maria Volkova", amount: 3000, method: "bank_transfer", receivedAt: "2026-03-26T12:00:00.000Z", note: "Advance payment" }
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
    properties: raw.properties ?? defaults.properties,
    users: (raw.users ?? defaults.users).map((user) => ({
      ...user,
      propertyId: user.propertyId ?? fallbackPropertyId,
      azAccessRole: user.azAccessRole ?? (user.role === "owner" ? "admin" : "staff"),
      active: user.active ?? true
    })),
    authSessions: (raw.authSessions ?? defaults.authSessions).map((session) => ({
      ...session,
      propertyId: session.propertyId ?? fallbackPropertyId,
      propertyName: session.propertyName ?? fallbackPropertyName,
      azAccessRole: session.azAccessRole ?? (session.role === "owner" ? "admin" : "staff")
    })),
    guests: (raw.guests ?? defaults.guests).map((item) => withPropertyId(item, fallbackPropertyId)),
    reservations: (raw.reservations ?? defaults.reservations).map((item) => withPropertyId(item, fallbackPropertyId)),
    rooms: (raw.rooms ?? defaults.rooms).map((item) => withPropertyId(item, fallbackPropertyId)),
    housekeepingTasks: (raw.housekeepingTasks ?? defaults.housekeepingTasks).map((item) => withPropertyId(item, fallbackPropertyId)),
    maintenanceIncidents: (raw.maintenanceIncidents ?? defaults.maintenanceIncidents).map((item) => withPropertyId(item, fallbackPropertyId)),
    folios: (raw.folios ?? defaults.folios).map((item) => ({ ...withPropertyId(item, fallbackPropertyId), charges: item.charges ?? [], payments: item.payments ?? [] })),
    payments: (raw.payments ?? defaults.payments).map((item) => withPropertyId(item, fallbackPropertyId)),
    stays: (raw.stays ?? defaults.stays).map((item) => withPropertyId(item, fallbackPropertyId)),
    auditLogs: (raw.auditLogs ?? defaults.auditLogs).map((item) => withPropertyId(item, fallbackPropertyId)),
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
