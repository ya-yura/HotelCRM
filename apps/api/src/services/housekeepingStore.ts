import type { HousekeepingTaskStatus, HousekeepingTaskSummary } from "@hotel-crm/shared/housekeeping";
import { getHotelData, updateHotelData } from "./dataStore";

export async function listHousekeepingTasks(propertyId: string) {
  return (await getHotelData()).housekeepingTasks.filter((task) => task.propertyId === propertyId);
}

export async function createHousekeepingTask(propertyId: string, task: HousekeepingTaskSummary) {
  return updateHotelData(async (data) => {
    const existing = data.housekeepingTasks.find(
      (entry) => entry.propertyId === propertyId && entry.id === task.id
    );
    if (existing) {
      return existing;
    }

    data.housekeepingTasks.unshift({ ...task, propertyId });
    return task;
  });
}

export async function updateHousekeepingTask(propertyId: string, id: string, status: HousekeepingTaskStatus) {
  return updateHotelData(async (data) => {
    const index = data.housekeepingTasks.findIndex(
      (task) => task.propertyId === propertyId && task.id === id
    );
    if (index === -1) {
      return null;
    }

    const task = data.housekeepingTasks[index];
    const updated = {
      ...task,
      status,
      dueLabel: status === "completed" ? "Done" : task.dueLabel
    };
    data.housekeepingTasks[index] = updated;
    return updated as HousekeepingTaskSummary;
  });
}
