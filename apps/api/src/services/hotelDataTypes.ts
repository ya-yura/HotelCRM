import type { AuditLog } from "@hotel-crm/shared/audit";
import type { AIAssistantItem } from "@hotel-crm/shared/ai";
import type { AuthSession, HotelRole } from "@hotel-crm/shared/auth";
import type { BackgroundJob } from "@hotel-crm/shared/jobs";
import type { ComplianceSubmission } from "@hotel-crm/shared/compliance";
import type {
  AzBooking,
  AzChannelSyncRecord,
  AzGuest,
  AzHousekeepingTask,
  AzReportData,
  AzRoom
} from "@hotel-crm/shared/features/azhotel_core";
import type { GuestProfile } from "@hotel-crm/shared/guests";
import type { HousekeepingTaskSummary } from "@hotel-crm/shared/housekeeping";
import type { MaintenanceIncident } from "@hotel-crm/shared/maintenance";
import type { NotificationDelivery } from "@hotel-crm/shared/notifications";
import type { FolioDetails, PaymentRecord } from "@hotel-crm/shared/payments";
import type { PropertySummary } from "@hotel-crm/shared/properties";
import type { ReservationSummary } from "@hotel-crm/shared/reservations";
import type { RoomSummary } from "@hotel-crm/shared/rooms";
import type { StayRecord } from "@hotel-crm/shared/stays";
import type { SyncConflict, SyncQueueItem } from "@hotel-crm/shared/sync";

export type PropertyScoped<T> = T & { propertyId: string };

export type PersistedUser = {
  id: string;
  propertyId: string;
  name: string;
  email?: string;
  role: HotelRole;
  azAccessRole?: "admin" | "staff";
  pin?: string;
  password?: string;
  active: boolean;
};

export type HotelData = {
  schemaVersion: number;
  properties: PropertySummary[];
  users: PersistedUser[];
  authSessions: AuthSession[];
  guests: PropertyScoped<GuestProfile>[];
  reservations: PropertyScoped<ReservationSummary>[];
  rooms: PropertyScoped<RoomSummary>[];
  housekeepingTasks: PropertyScoped<HousekeepingTaskSummary>[];
  maintenanceIncidents: PropertyScoped<MaintenanceIncident>[];
  folios: PropertyScoped<FolioDetails>[];
  payments: PropertyScoped<PaymentRecord>[];
  stays: PropertyScoped<StayRecord>[];
  auditLogs: PropertyScoped<AuditLog>[];
  syncQueue: PropertyScoped<SyncQueueItem>[];
  syncConflicts: PropertyScoped<SyncConflict>[];
  assistantItems: AIAssistantItem[];
  notificationDeliveries: NotificationDelivery[];
  complianceSubmissions: ComplianceSubmission[];
  backgroundJobs: BackgroundJob[];
  azRooms: PropertyScoped<AzRoom>[];
  azBookings: PropertyScoped<AzBooking>[];
  azGuests: PropertyScoped<AzGuest>[];
  azHousekeepingTasks: PropertyScoped<AzHousekeepingTask>[];
  azReportData: PropertyScoped<AzReportData>[];
  azChannelSyncRecords: PropertyScoped<AzChannelSyncRecord>[];
};
