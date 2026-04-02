import { z } from "zod";

export const housekeepingTaskStatusSchema = z.enum([
  "queued",
  "in_progress",
  "completed",
  "cancelled"
]);

export const housekeepingTaskSummarySchema = z.object({
  id: z.string(),
  roomId: z.string(),
  roomNumber: z.string(),
  priority: z.enum(["normal", "urgent"]),
  status: housekeepingTaskStatusSchema,
  taskType: z.enum(["checkout_clean", "inspection", "manual_clean"]),
  note: z.string(),
  dueLabel: z.string()
});

export const housekeepingTaskUpdateSchema = z.object({
  status: housekeepingTaskStatusSchema
});

export type HousekeepingTaskStatus = z.infer<typeof housekeepingTaskStatusSchema>;
export type HousekeepingTaskSummary = z.infer<typeof housekeepingTaskSummarySchema>;
export type HousekeepingTaskUpdate = z.infer<typeof housekeepingTaskUpdateSchema>;
