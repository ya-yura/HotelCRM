import type { PropertySummary, PropertyUpdateRequest } from "@hotel-crm/shared/properties";
import { propertySummarySchema } from "@hotel-crm/shared/properties";
import { getHotelData, updateHotelData } from "./dataStore";

function mergeProperty(current: PropertySummary, patch: PropertyUpdateRequest) {
  return propertySummarySchema.parse({
    ...current,
    ...patch,
    legalInfo: {
      ...current.legalInfo,
      ...(patch.legalInfo ?? {})
    },
    notificationSettings: {
      ...current.notificationSettings,
      ...(patch.notificationSettings ?? {})
    },
    operationSettings: {
      ...current.operationSettings,
      ...(patch.operationSettings ?? {})
    },
    complianceSettings: {
      ...current.complianceSettings,
      ...(patch.complianceSettings ?? {})
    }
  });
}

export async function getPropertyById(propertyId: string) {
  return (await getHotelData()).properties.find((property) => property.id === propertyId) ?? null;
}

export async function updateProperty(propertyId: string, patch: PropertyUpdateRequest) {
  return updateHotelData(async (data) => {
    const index = data.properties.findIndex((property) => property.id === propertyId);
    if (index === -1) {
      return null;
    }

    const current = data.properties[index];
    const next = mergeProperty(current, patch);
    data.properties[index] = next;

    data.authSessions = data.authSessions.map((session) =>
      session.propertyId === propertyId ? { ...session, propertyName: next.name } : session
    );

    data.auditLogs.unshift({
      propertyId,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      entityType: "property",
      entityId: propertyId,
      action: "settings_updated",
      reason: `Property settings updated for ${next.name}`,
      createdAt: new Date().toISOString()
    });

    return next;
  });
}
