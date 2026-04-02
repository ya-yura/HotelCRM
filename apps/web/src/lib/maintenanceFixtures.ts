import type { MaintenanceIncident } from "@hotel-crm/shared/maintenance";

export const initialMaintenanceIncidents: MaintenanceIncident[] = [
  {
    id: "maint_room_305",
    roomId: "room_305",
    roomNumber: "305",
    title: "Протечка в ванной",
    description: "Вода идёт из-под тумбы под раковиной",
    priority: "high",
    status: "open",
    assignee: "Roman Maintenance",
    reportedBy: "Olga Housekeeping",
    locationLabel: "Ванная комната",
    impact: "block_from_sale",
    roomBlocked: true,
    resolutionNote: "",
    linkedHousekeepingTaskId: null,
    evidence: [],
    createdAt: "2026-03-25T07:20:00.000Z",
    updatedAt: "2026-03-25T08:10:00.000Z",
    resolvedAt: null
  }
];
