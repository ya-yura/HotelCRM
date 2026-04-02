import type { PoolClient } from "pg";
import type { AuditLog } from "@hotel-crm/shared/audit";
import type { AIAssistantItem } from "@hotel-crm/shared/ai";
import type { AuthSession } from "@hotel-crm/shared/auth";
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
import { getPostgresPool } from "../lib/postgres";
import { hydrateData, schemaVersion } from "./hotelDefaults";
import type { HotelData, PersistedUser, PropertyScoped } from "./hotelDataTypes";

function coercePayload<T>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

async function selectPayloads<T>(client: PoolClient, tableName: string, orderBy: string) {
  const result = await client.query(`SELECT payload FROM ${tableName} ORDER BY ${orderBy}`);
  return result.rows.map((row) => coercePayload<T>(row.payload));
}

async function withPostgresClient<T>(callback: (client: PoolClient) => Promise<T>) {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function insertMany(client: PoolClient, sql: string, rows: unknown[][]) {
  for (const values of rows) {
    await client.query(sql, values);
  }
}

export async function loadPostgresData(): Promise<HotelData | null> {
  return withPostgresClient(async (client) => {
    try {
      const [
        properties,
        users,
        authSessions,
        guests,
        reservations,
        rooms,
        housekeepingTasks,
        maintenanceIncidents,
        folios,
        payments,
        stays,
        auditLogs,
        syncQueue,
        syncConflicts,
        assistantItems,
        notificationDeliveries,
        complianceSubmissions,
        backgroundJobs,
        azRooms,
        azBookings,
        azGuests,
        azHousekeepingTasks,
        azReportData,
        azChannelSyncRecords
      ] = await Promise.all([
        selectPayloads<PropertySummary>(client, "properties", "name, id"),
        selectPayloads<PersistedUser>(client, "users", "property_id, name, id"),
        selectPayloads<AuthSession>(client, "auth_sessions", "updated_at DESC, token"),
        selectPayloads<PropertyScoped<GuestProfile>>(client, "guests", "property_id, full_name, id"),
        selectPayloads<PropertyScoped<ReservationSummary>>(client, "reservations", "check_in_date, id"),
        selectPayloads<PropertyScoped<RoomSummary>>(client, "rooms", "property_id, room_number"),
        selectPayloads<PropertyScoped<HousekeepingTaskSummary>>(client, "housekeeping_tasks", "updated_at DESC, id"),
        selectPayloads<PropertyScoped<MaintenanceIncident>>(client, "maintenance_incidents", "updated_at DESC, id"),
        selectPayloads<PropertyScoped<FolioDetails>>(client, "folios", "property_id, reservation_id"),
        selectPayloads<PropertyScoped<PaymentRecord>>(client, "payments", "received_at DESC, id"),
        selectPayloads<PropertyScoped<StayRecord>>(client, "stays", "checked_in_at DESC, id"),
        selectPayloads<PropertyScoped<AuditLog>>(client, "audit_logs", "created_at DESC, id"),
        selectPayloads<PropertyScoped<SyncQueueItem>>(client, "sync_queue", "updated_at DESC, id"),
        selectPayloads<PropertyScoped<SyncConflict>>(client, "sync_conflicts", "updated_at DESC, id"),
        selectPayloads<AIAssistantItem>(client, "assistant_items", "updated_at DESC, id"),
        selectPayloads<NotificationDelivery>(client, "notification_deliveries", "created_at DESC, id"),
        selectPayloads<ComplianceSubmission>(client, "compliance_submissions", "created_at DESC, id"),
        selectPayloads<BackgroundJob>(client, "background_jobs", "run_at, id"),
        selectPayloads<PropertyScoped<AzRoom>>(client, "az_rooms", "property_id, room_number"),
        selectPayloads<PropertyScoped<AzBooking>>(client, "az_bookings", "check_in_date, id"),
        selectPayloads<PropertyScoped<AzGuest>>(client, "az_guests", "property_id, name, id"),
        selectPayloads<PropertyScoped<AzHousekeepingTask>>(client, "az_housekeeping_tasks", "task_date DESC, id"),
        selectPayloads<PropertyScoped<AzReportData>>(client, "az_report_data", "report_date DESC, id"),
        selectPayloads<PropertyScoped<AzChannelSyncRecord>>(client, "az_channel_sync_records", "synced_at DESC, id")
      ]);

      if (properties.length === 0) {
        return null;
      }

      return hydrateData({
        schemaVersion,
        properties,
        users,
        authSessions,
        guests,
        reservations,
        rooms,
        housekeepingTasks,
        maintenanceIncidents,
        folios,
        payments,
        stays,
        auditLogs,
        syncQueue,
        syncConflicts,
        assistantItems,
        notificationDeliveries,
        complianceSubmissions,
        backgroundJobs,
        azRooms,
        azBookings,
        azGuests,
        azHousekeepingTasks,
        azReportData,
        azChannelSyncRecords
      });
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42P01") {
        throw new Error(
          "PostgreSQL schema is not initialized. Run `npm run db:migrate -w apps/api` before starting the API in postgres mode."
        );
      }
      throw error;
    }
  });
}

export async function savePostgresData(data: HotelData) {
  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(`
        TRUNCATE TABLE
          properties,
          users,
          auth_sessions,
          guests,
          reservations,
          rooms,
          housekeeping_tasks,
          maintenance_incidents,
          folios,
          payments,
          stays,
          audit_logs,
          sync_queue,
          sync_conflicts,
          assistant_items,
          notification_deliveries,
          compliance_submissions,
          background_jobs,
          az_rooms,
          az_bookings,
          az_guests,
          az_housekeeping_tasks,
          az_report_data,
          az_channel_sync_records
      `);

      await insertMany(client, "INSERT INTO properties (id, name, timezone, currency, address, active, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.properties.map((item) => [item.id, item.name, item.timezone, item.currency, item.address, item.active, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO users (id, property_id, role, email, active, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", data.users.map((item) => [item.id, item.propertyId, item.role, item.email ?? null, item.active, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO auth_sessions (token, property_id, user_id, role, payload, updated_at) VALUES ($1, $2, $3, $4, $5::jsonb, NOW())", data.authSessions.map((item) => [item.token, item.propertyId, item.userId, item.role, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO guests (id, property_id, full_name, phone, email, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", data.guests.map((item) => [item.id, item.propertyId, item.fullName, item.phone, item.email, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO reservations (id, property_id, guest_name, room_label, check_in_date, check_out_date, status, balance_due, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)", data.reservations.map((item) => [item.id, item.propertyId, item.guestName, item.roomLabel, item.checkInDate, item.checkOutDate, item.status, item.balanceDue, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO rooms (id, property_id, room_number, room_type, status, priority, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.rooms.map((item) => [item.id, item.propertyId, item.number, item.roomType, item.status, item.priority, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO housekeeping_tasks (id, property_id, room_id, room_number, status, priority, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.housekeepingTasks.map((item) => [item.id, item.propertyId, item.roomId, item.roomNumber, item.status, item.priority, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO maintenance_incidents (id, property_id, room_id, room_number, priority, status, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.maintenanceIncidents.map((item) => [item.id, item.propertyId, item.roomId, item.roomNumber, item.priority, item.status, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO folios (reservation_id, property_id, guest_name, status, total_amount, paid_amount, balance_due, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)", data.folios.map((item) => [item.reservationId, item.propertyId, item.guestName, item.status, item.totalAmount, item.paidAmount, item.balanceDue, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO payments (id, property_id, reservation_id, received_at, method, amount, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.payments.map((item) => [item.id, item.propertyId, item.reservationId, item.receivedAt, item.method, item.amount, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO stays (id, property_id, reservation_id, room_id, status, checked_in_at, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.stays.map((item) => [item.id, item.propertyId, item.reservationId, item.roomId, item.status, item.checkedInAt, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO audit_logs (id, property_id, entity_type, entity_id, created_at, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", data.auditLogs.map((item) => [item.id, item.propertyId, item.entityType, item.entityId, item.createdAt, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO sync_queue (id, property_id, entity_type, entity_id, status, local_version, retry_count, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)", data.syncQueue.map((item) => [item.id, item.propertyId, item.entityType, item.entityId, item.status, item.localVersion, item.retryCount, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO sync_conflicts (id, property_id, entity_type, entity_id, payload) VALUES ($1, $2, $3, $4, $5::jsonb)", data.syncConflicts.map((item) => [item.id, item.propertyId, item.entityType, item.entityId, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO assistant_items (id, item_type, title, payload) VALUES ($1, $2, $3, $4::jsonb)", data.assistantItems.map((item) => [item.id, item.type, item.title, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO notification_deliveries (id, property_id, channel, status, created_at, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", data.notificationDeliveries.map((item) => [item.id, item.propertyId, item.channel, item.status, item.createdAt, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO compliance_submissions (id, property_id, kind, entity_type, entity_id, status, created_at, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)", data.complianceSubmissions.map((item) => [item.id, item.propertyId, item.kind, item.entityType, item.entityId, item.status, item.createdAt, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO background_jobs (id, property_id, job_type, status, run_at, attempts, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.backgroundJobs.map((item) => [item.id, item.propertyId, item.jobType, item.status, item.runAt, item.attempts, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO az_rooms (id, property_id, room_number, room_type, status, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", data.azRooms.map((item) => [item.id, item.propertyId, item.number, item.type, item.status, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO az_bookings (id, property_id, guest_id, room_id, check_in_date, check_out_date, status, channel, total, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)", data.azBookings.map((item) => [item.id, item.propertyId, item.guestId, item.roomId, item.dates.checkIn, item.dates.checkOut, item.status, item.channel, item.total, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO az_guests (id, property_id, name, phone, email, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", data.azGuests.map((item) => [item.id, item.propertyId, item.name, item.contact.phone, item.contact.email, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO az_housekeeping_tasks (id, property_id, room_id, task_date, status, assignee, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.azHousekeepingTasks.map((item) => [item.id, item.propertyId, item.roomId, item.date, item.status, item.assignee, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO az_report_data (id, property_id, report_date, occupancy_rate, revenue, bookings, payload) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)", data.azReportData.map((item) => [item.id, item.propertyId, item.date, item.occupancyRate, item.revenue, item.bookings, JSON.stringify(item)]));
      await insertMany(client, "INSERT INTO az_channel_sync_records (id, property_id, room_id, channel, action, status, synced_at, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)", data.azChannelSyncRecords.map((item) => [item.id, item.propertyId, item.roomId, item.channel, item.action, item.status, item.syncedAt, JSON.stringify(item)]));

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}
