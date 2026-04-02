import type {
  HousekeepingTaskCreate,
  HousekeepingTaskStatus,
  HousekeepingTaskSummary,
  HousekeepingTaskUpdate
} from "@hotel-crm/shared/housekeeping";
import { getHotelData, updateHotelData } from "./dataStore";
import { buildRoomOperationalState } from "./roomStore";

export async function listHousekeepingTasks(propertyId: string) {
  const priorityWeight = {
    urgent: 0,
    normal: 1
  } as const;

  return (await getHotelData()).housekeepingTasks
    .filter((task) => task.propertyId === propertyId)
    .sort(
      (left, right) =>
        priorityWeight[left.priority] - priorityWeight[right.priority] ||
        right.createdAt.localeCompare(left.createdAt)
    );
}

export async function createHousekeepingTask(propertyId: string, task: HousekeepingTaskCreate) {
  return updateHotelData(async (data) => {
    const taskId = task.id ?? `task_${task.roomId}_${Date.now()}`;
    const existing = data.housekeepingTasks.find(
      (entry) => entry.propertyId === propertyId && entry.id === taskId
    );
    if (existing) {
      return existing;
    }

    const timestamp = task.createdAt ?? new Date().toISOString();
    const created = {
      propertyId,
      id: taskId,
      roomId: task.roomId,
      roomNumber: task.roomNumber,
      priority: task.priority,
      status: task.status,
      taskType: task.taskType,
      note: task.note,
      dueLabel: task.dueLabel,
      assigneeName: task.assigneeName,
      shiftLabel: task.shiftLabel,
      problemNote: task.problemNote,
      requestedInspection: task.requestedInspection,
      checklist: task.checklist,
      evidence: task.evidence,
      consumables: task.consumables,
      createdAt: timestamp,
      updatedAt: task.updatedAt ?? timestamp
    };

    data.housekeepingTasks.unshift(created);
    return created as HousekeepingTaskSummary;
  });
}

function deriveDueLabel(
  status: HousekeepingTaskStatus,
  currentDueLabel: string,
  requestedInspection: boolean
) {
  if (status === "completed") {
    return "Done";
  }

  if (status === "in_progress") {
    return "Cleaning now";
  }

  if (status === "inspection_requested" || requestedInspection) {
    return "Inspection requested";
  }

  if (status === "paused") {
    return "Paused this shift";
  }

  if (status === "problem_reported") {
    return "Waiting for maintenance";
  }

  return currentDueLabel;
}

function syncRoomFromHousekeepingTask(
  data: Awaited<ReturnType<typeof getHotelData>>,
  propertyId: string,
  task: HousekeepingTaskSummary
) {
  const roomIndex = data.rooms.findIndex(
    (room) => room.propertyId === propertyId && room.id === task.roomId
  );
  if (roomIndex === -1) {
    return;
  }

  const room = data.rooms[roomIndex];
  let nextStatus = room.status;

  if (task.status === "queued" || task.status === "paused") {
    nextStatus = "dirty";
  } else if (task.status === "in_progress") {
    nextStatus = "cleaning";
  } else if (task.status === "inspection_requested" || task.status === "completed") {
    nextStatus = "inspected";
  }

  const description = buildRoomOperationalState(nextStatus);
  data.rooms[roomIndex] = {
    ...room,
    status: nextStatus,
    readiness: description.readiness,
    readinessLabel:
      task.status === "inspection_requested" ? "Ждет проверки" : description.readinessLabel,
    housekeepingNote:
      task.status === "problem_reported"
        ? task.problemNote || "Problem reported from housekeeping"
        : description.housekeepingNote,
    nextAction:
      task.status === "problem_reported"
        ? "Create or continue maintenance ticket"
        : description.nextAction,
    occupancyLabel: description.occupancyLabel,
    lastCleanedAt:
      task.status === "completed" || task.status === "inspection_requested"
        ? new Date().toISOString()
        : room.lastCleanedAt
  };
}

export async function updateHousekeepingTask(propertyId: string, id: string, patch: HousekeepingTaskUpdate) {
  return updateHotelData(async (data) => {
    const index = data.housekeepingTasks.findIndex(
      (task) => task.propertyId === propertyId && task.id === id
    );
    if (index === -1) {
      return null;
    }

    const task = data.housekeepingTasks[index];
    const nextStatus = patch.status ?? task.status;
    const updated = {
      ...task,
      ...patch,
      status: nextStatus,
      requestedInspection:
        (patch.requestedInspection ?? task.requestedInspection ?? false) ||
        nextStatus === "inspection_requested",
      dueLabel: deriveDueLabel(
        nextStatus,
        patch.dueLabel ?? task.dueLabel,
        patch.requestedInspection ?? task.requestedInspection
      ),
      updatedAt: new Date().toISOString()
    };
    data.housekeepingTasks[index] = updated;
    syncRoomFromHousekeepingTask(data, propertyId, updated as HousekeepingTaskSummary);
    return updated as HousekeepingTaskSummary;
  });
}
