import {
  buildManagementDashboardSummary,
  buildManagementReportCsv,
  buildManagementReportSummary,
  type ManagementDateRange
} from "@hotel-crm/shared/management";
import { listComplianceSubmissions } from "./complianceStore";
import { listHousekeepingTasks } from "./housekeepingStore";
import { listMaintenanceIncidents } from "./maintenanceStore";
import { listFolios, listPayments } from "./paymentStore";
import { listReservations } from "./reservationStore";
import { listRooms } from "./roomStore";

function defaultDashboardRange(nowIso = new Date().toISOString()): ManagementDateRange {
  const today = nowIso.slice(0, 10);
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 6);

  return {
    from: from.toISOString().slice(0, 10),
    to: today
  };
}

function defaultReportRange(nowIso = new Date().toISOString()): ManagementDateRange {
  const now = new Date(nowIso);
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
  };
}

async function loadAnalyticsInput(propertyId: string) {
  const [reservations, rooms, folios, payments, housekeepingTasks, maintenanceIncidents, complianceSubmissions] =
    await Promise.all([
      listReservations(propertyId),
      listRooms(propertyId),
      listFolios(propertyId),
      listPayments(propertyId),
      listHousekeepingTasks(propertyId),
      listMaintenanceIncidents(propertyId),
      listComplianceSubmissions(propertyId)
    ]);

  return {
    reservations,
    rooms,
    folios,
    payments,
    housekeepingTasks,
    maintenanceIncidents,
    complianceSubmissions
  };
}

export async function getManagementDashboard(propertyId: string, range?: Partial<ManagementDateRange>) {
  return buildManagementDashboardSummary({
    ...(await loadAnalyticsInput(propertyId)),
    range: range?.from || range?.to ? range : defaultDashboardRange(),
    sourceMode: "live"
  });
}

export async function getManagementReport(propertyId: string, range?: Partial<ManagementDateRange>) {
  return buildManagementReportSummary({
    ...(await loadAnalyticsInput(propertyId)),
    range: range?.from || range?.to ? range : defaultReportRange(),
    sourceMode: "live"
  });
}

export async function exportManagementReportCsv(propertyId: string, range?: Partial<ManagementDateRange>) {
  const report = await getManagementReport(propertyId, range);
  return buildManagementReportCsv(report);
}
