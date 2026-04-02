import { z } from "zod";

export const syncStatusSchema = z.enum([
  "queued",
  "syncing",
  "synced",
  "failed_retryable",
  "failed_conflict"
]);

export const syncEntityTypeSchema = z.enum([
  "reservation",
  "room",
  "housekeeping_task",
  "payment"
]);

export const syncQueueItemSchema = z.object({
  id: z.string(),
  entityType: syncEntityTypeSchema,
  entityId: z.string(),
  operation: z.enum(["create", "update"]),
  action: z.string(),
  payloadJson: z.string(),
  localVersion: z.number().int().positive(),
  status: syncStatusSchema,
  summary: z.string(),
  lastAttemptLabel: z.string(),
  retryCount: z.number().int().min(0).default(0)
});

export const syncConflictSchema = z.object({
  id: z.string(),
  entityType: syncEntityTypeSchema,
  entityId: z.string(),
  localSummary: z.string(),
  serverSummary: z.string(),
  recommendedAction: z.string()
});

export type SyncQueueItem = z.infer<typeof syncQueueItemSchema>;
export type SyncConflict = z.infer<typeof syncConflictSchema>;
