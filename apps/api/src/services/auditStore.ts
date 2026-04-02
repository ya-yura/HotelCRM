import type { AuditLog } from "@hotel-crm/shared/audit";
import { getHotelData, updateHotelData } from "./dataStore";

export async function listAuditLogs(propertyId: string) {
  return (await getHotelData()).auditLogs.filter((log) => log.propertyId === propertyId);
}

export async function appendAuditLog(
  propertyId: string,
  input: Omit<AuditLog, "id" | "createdAt">
) {
  return updateHotelData(async (data) => {
    const log = {
      propertyId,
      id: `audit_${Date.now()}_${data.auditLogs.length + 1}`,
      createdAt: new Date().toISOString(),
      ...input
    };

    data.auditLogs.unshift(log);
    return log as AuditLog;
  });
}
