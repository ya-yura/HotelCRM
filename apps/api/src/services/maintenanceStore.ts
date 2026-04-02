import type {
  MaintenanceCreate,
  MaintenanceIncident,
  MaintenanceUpdate
} from "@hotel-crm/shared/maintenance";
import { getHotelData, updateHotelData } from "./dataStore";
import { buildRoomOperationalState } from "./roomStore";

function isBlockingIncident(incident: Pick<MaintenanceIncident, "status" | "roomBlocked" | "impact">) {
  return (
    ["open", "in_progress"].includes(incident.status) &&
    (incident.roomBlocked || incident.impact === "block_from_sale")
  );
}

function sortIncidents(left: MaintenanceIncident, right: MaintenanceIncident) {
  const leftRank = left.status === "resolved" || left.status === "cancelled" ? 1 : 0;
  const rightRank = right.status === "resolved" || right.status === "cancelled" ? 1 : 0;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const priorityWeight = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3
  } as const;

  return (
    priorityWeight[left.priority] - priorityWeight[right.priority] ||
    right.createdAt.localeCompare(left.createdAt)
  );
}

function syncRoomFromIncident(
  data: Awaited<ReturnType<typeof getHotelData>>,
  propertyId: string,
  incident: MaintenanceIncident
) {
  const roomIndex = data.rooms.findIndex(
    (room) => room.propertyId === propertyId && room.id === incident.roomId
  );

  if (roomIndex === -1) {
    return;
  }

  const room = data.rooms[roomIndex];

  if (isBlockingIncident(incident)) {
    const description = buildRoomOperationalState("blocked_maintenance");
    data.rooms[roomIndex] = {
      ...room,
      status: "blocked_maintenance",
      readiness: description.readiness,
      readinessLabel: description.readinessLabel,
      housekeepingNote: incident.title,
      nextAction: incident.assignee
        ? `Assigned to ${incident.assignee}. Keep blocked until resolved`
        : "Keep blocked until maintenance picks up the issue",
      occupancyLabel: "Unavailable",
      priority: "blocked",
      outOfOrderReason: incident.title,
      activeMaintenanceIncidentId: incident.id
    };
    return;
  }

  if (room.activeMaintenanceIncidentId !== incident.id && room.status !== "blocked_maintenance") {
    return;
  }

  const description = buildRoomOperationalState("dirty");
  data.rooms[roomIndex] = {
    ...room,
    status: "dirty",
    readiness: description.readiness,
    readinessLabel: "После ремонта",
    housekeepingNote: "Requires turnover after maintenance",
    nextAction: "Send to housekeeping inspection before returning to sale",
    occupancyLabel: "Needs reset",
    priority: "normal",
    outOfOrderReason: "",
    activeMaintenanceIncidentId: null
  };

  const activeCleanupTask = data.housekeepingTasks.find(
    (task) =>
      task.propertyId === propertyId &&
      task.roomId === incident.roomId &&
      task.status !== "completed" &&
      task.status !== "cancelled"
  );

  if (!activeCleanupTask) {
    data.housekeepingTasks.unshift({
      propertyId,
      id: `task_post_maintenance_${incident.roomId}_${Date.now()}`,
      roomId: incident.roomId,
      roomNumber: incident.roomNumber,
      priority: "urgent",
      status: "queued",
      taskType: "inspection",
      note: "Return room to service after maintenance",
      dueLabel: "Before returning to sale",
      assigneeName: "",
      shiftLabel: "Next shift",
      problemNote: "",
      requestedInspection: true,
      checklist: [
        { label: "Check repair quality", done: false },
        { label: "Refresh room and reset amenities", done: false }
      ],
      evidence: [],
      consumables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

export async function listMaintenanceIncidents(propertyId: string) {
  return (await getHotelData()).maintenanceIncidents
    .filter((incident) => incident.propertyId === propertyId)
    .sort(sortIncidents);
}

export async function getMaintenanceIncident(propertyId: string, id: string) {
  return (
    (await getHotelData()).maintenanceIncidents.find(
      (incident) => incident.propertyId === propertyId && incident.id === id
    ) ?? null
  );
}

export async function createMaintenanceIncident(propertyId: string, input: MaintenanceCreate) {
  return updateHotelData(async (data) => {
    const timestamp = new Date().toISOString();
    const incident: typeof data.maintenanceIncidents[number] = {
      propertyId,
      id: `maint_${input.roomId}_${Date.now()}`,
      roomId: input.roomId,
      roomNumber: input.roomNumber,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "open",
      assignee: input.assignee,
      reportedBy: input.reportedBy,
      locationLabel: input.locationLabel,
      impact: input.impact,
      roomBlocked: input.roomBlocked,
      resolutionNote: "",
      linkedHousekeepingTaskId: input.linkedHousekeepingTaskId,
      evidence: input.evidence,
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null
    };

    data.maintenanceIncidents.unshift(incident);
    syncRoomFromIncident(data, propertyId, incident as MaintenanceIncident);
    return incident as MaintenanceIncident;
  });
}

export async function updateMaintenanceIncident(
  propertyId: string,
  id: string,
  patch: MaintenanceUpdate
) {
  return updateHotelData(async (data) => {
    const index = data.maintenanceIncidents.findIndex(
      (incident) => incident.propertyId === propertyId && incident.id === id
    );
    if (index === -1) {
      return null;
    }

    const current = data.maintenanceIncidents[index];
    const nextStatus = patch.status ?? current.status;
    const updated = {
      ...current,
      ...patch,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      resolvedAt:
        nextStatus === "resolved"
          ? current.resolvedAt ?? new Date().toISOString()
          : nextStatus === "cancelled"
            ? current.resolvedAt
            : null
    };

    data.maintenanceIncidents[index] = updated;
    syncRoomFromIncident(data, propertyId, updated as MaintenanceIncident);
    return updated as MaintenanceIncident;
  });
}
