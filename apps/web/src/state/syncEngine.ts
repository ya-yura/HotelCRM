import type { CreateCharge, CreatePayment } from "@hotel-crm/shared/payments";
import type { ReservationCreate, ReservationSummary } from "@hotel-crm/shared/reservations";
import type { RoomStatus, RoomSummary } from "@hotel-crm/shared/rooms";
import type { SyncQueueItem } from "@hotel-crm/shared/sync";
import type { HousekeepingTaskStatus, HousekeepingTaskSummary } from "@hotel-crm/shared/housekeeping";
import type { MaintenanceCreate, MaintenanceIncident, MaintenanceUpdate } from "@hotel-crm/shared/maintenance";
import type { FolioDetails, FolioSummary, PaymentRecord } from "@hotel-crm/shared/payments";
import {
  checkInReservationRequest,
  checkOutReservationRequest,
  createMaintenanceIncidentRequest,
  confirmReservationRequest,
  createChargeRequest,
  createReservationRequest,
  reassignReservationRoomRequest,
  recordPaymentRequest,
  resolveMaintenanceIncidentRequest,
  updateMaintenanceIncidentRequest,
  patchHousekeepingTaskRequest,
  updateHousekeepingTaskRequest,
  updateRoomStatusRequest
} from "../lib/api";

export type SyncReplayResult =
  | ReservationSummary
  | RoomSummary
  | HousekeepingTaskSummary
  | MaintenanceIncident
  | { charge: import("@hotel-crm/shared/payments").FolioCharge; folio: import("@hotel-crm/shared/payments").FolioDetails }
  | { payment: PaymentRecord; folio: FolioDetails }
  | null;

export async function replaySyncItem(item: SyncQueueItem): Promise<SyncReplayResult> {
  const payload = JSON.parse(item.payloadJson) as Record<string, unknown>;

  switch (item.action) {
    case "create_reservation":
      return createReservationRequest(payload as unknown as ReservationCreate);
    case "confirm_reservation":
      return confirmReservationRequest(String(payload.reservationId));
    case "reassign_room":
      return reassignReservationRoomRequest(
        String(payload.reservationId),
        String(payload.roomLabel)
      );
    case "check_in":
      return checkInReservationRequest(String(payload.reservationId));
    case "check_out":
      return checkOutReservationRequest(String(payload.reservationId));
    case "update_room_status":
      return updateRoomStatusRequest(
        String(payload.roomId),
        String(payload.status) as RoomStatus
      );
    case "update_housekeeping":
      return updateHousekeepingTaskRequest(
        String(payload.taskId),
        String(payload.status) as HousekeepingTaskStatus
      );
    case "patch_housekeeping":
      return patchHousekeepingTaskRequest(
        String(payload.taskId),
        payload.patch as unknown as Parameters<typeof patchHousekeepingTaskRequest>[1]
      );
    case "create_maintenance_incident":
      return createMaintenanceIncidentRequest(payload as unknown as MaintenanceCreate);
    case "update_maintenance_incident":
      return updateMaintenanceIncidentRequest(
        String(payload.incidentId),
        payload.patch as unknown as MaintenanceUpdate
      );
    case "resolve_maintenance_incident":
      return resolveMaintenanceIncidentRequest(
        String(payload.incidentId),
        payload.patch as unknown as MaintenanceUpdate
      );
    case "record_payment":
      return recordPaymentRequest(payload as unknown as CreatePayment);
    case "create_charge":
      return createChargeRequest(payload as unknown as CreateCharge);
    default:
      throw new Error(`Unknown sync action: ${item.action}`);
  }
}
