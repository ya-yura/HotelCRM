import type { SyncConflict, SyncQueueItem } from "@hotel-crm/shared/sync";
import { getHotelData, updateHotelData } from "./dataStore";

export async function listSyncQueue(propertyId: string) {
  return (await getHotelData()).syncQueue.filter((item) => item.propertyId === propertyId);
}

export async function listSyncConflicts(propertyId: string) {
  return (await getHotelData()).syncConflicts.filter((item) => item.propertyId === propertyId);
}

export async function enqueueSyncItems(propertyId: string, items: SyncQueueItem[]) {
  return updateHotelData(async (data) => {
    data.syncQueue.unshift(...items.map((item) => ({ ...item, propertyId })));
    return items;
  });
}

export async function resolveSyncConflict(propertyId: string, id: string) {
  return updateHotelData(async (data) => {
    const index = data.syncConflicts.findIndex(
      (conflict) => conflict.propertyId === propertyId && conflict.id === id
    );
    if (index === -1) {
      return null;
    }

    const [resolved] = data.syncConflicts.splice(index, 1);
    data.syncQueue = data.syncQueue.map((item) =>
      item.propertyId === propertyId &&
      item.entityType === resolved.entityType &&
      item.entityId === resolved.entityId &&
      item.status === "failed_conflict"
        ? {
            ...item,
            status: "failed_retryable",
            lastAttemptLabel: "Conflict marked resolved, ready for retry"
          }
        : item
    );
    return resolved as SyncConflict;
  });
}
