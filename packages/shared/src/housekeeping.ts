import { z } from "zod";

export const housekeepingTaskStatusSchema = z.enum([
  "queued",
  "in_progress",
  "paused",
  "inspection_requested",
  "problem_reported",
  "completed",
  "cancelled"
]);

export const housekeepingTaskPrioritySchema = z.enum(["normal", "urgent"]);
export const housekeepingTaskTypeSchema = z.enum([
  "checkout_clean",
  "inspection",
  "manual_clean",
  "deep_clean",
  "turndown",
  "minibar_check"
]);

export const housekeepingChecklistItemSchema = z.object({
  label: z.string(),
  done: z.boolean().default(false)
});

export const housekeepingEvidenceSchema = z.object({
  id: z.string(),
  localUri: z.string().default(""),
  uploadedUrl: z.string().default(""),
  caption: z.string().default(""),
  createdAt: z.string()
});

export const housekeepingConsumableEntrySchema = z.object({
  id: z.string(),
  item: z.string(),
  quantity: z.number().int().min(1),
  unitLabel: z.string().default("шт"),
  unitPrice: z.number().min(0).default(0),
  postToFolio: z.boolean().default(false)
});

export const housekeepingTaskSummarySchema = z.object({
  id: z.string(),
  roomId: z.string(),
  roomNumber: z.string(),
  priority: housekeepingTaskPrioritySchema,
  status: housekeepingTaskStatusSchema,
  taskType: housekeepingTaskTypeSchema,
  note: z.string(),
  dueLabel: z.string(),
  assigneeName: z.string().default(""),
  shiftLabel: z.string().default(""),
  problemNote: z.string().default(""),
  requestedInspection: z.boolean().default(false),
  checklist: z.array(housekeepingChecklistItemSchema).default([]),
  evidence: z.array(housekeepingEvidenceSchema).default([]),
  consumables: z.array(housekeepingConsumableEntrySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const housekeepingTaskCreateSchema = housekeepingTaskSummarySchema.extend({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const housekeepingTaskUpdateSchema = z.object({
  status: housekeepingTaskStatusSchema.optional(),
  note: z.string().optional(),
  dueLabel: z.string().optional(),
  assigneeName: z.string().optional(),
  shiftLabel: z.string().optional(),
  problemNote: z.string().optional(),
  requestedInspection: z.boolean().optional(),
  checklist: z.array(housekeepingChecklistItemSchema).optional(),
  evidence: z.array(housekeepingEvidenceSchema).optional(),
  consumables: z.array(housekeepingConsumableEntrySchema).optional()
});

export type HousekeepingTaskStatus = z.infer<typeof housekeepingTaskStatusSchema>;
export type HousekeepingTaskPriority = z.infer<typeof housekeepingTaskPrioritySchema>;
export type HousekeepingTaskType = z.infer<typeof housekeepingTaskTypeSchema>;
export type HousekeepingChecklistItem = z.infer<typeof housekeepingChecklistItemSchema>;
export type HousekeepingEvidence = z.infer<typeof housekeepingEvidenceSchema>;
export type HousekeepingConsumableEntry = z.infer<typeof housekeepingConsumableEntrySchema>;
export type HousekeepingTaskSummary = z.infer<typeof housekeepingTaskSummarySchema>;
export type HousekeepingTaskCreate = z.infer<typeof housekeepingTaskCreateSchema>;
export type HousekeepingTaskUpdate = z.infer<typeof housekeepingTaskUpdateSchema>;
