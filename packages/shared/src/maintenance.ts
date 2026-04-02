import { z } from "zod";

export const maintenancePrioritySchema = z.enum(["low", "normal", "high", "critical"]);
export const maintenanceStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "cancelled"
]);

export const maintenanceImpactSchema = z.enum([
  "none",
  "housekeeping_delay",
  "block_from_sale"
]);

export const maintenanceEvidenceSchema = z.object({
  id: z.string(),
  localUri: z.string().default(""),
  uploadedUrl: z.string().default(""),
  caption: z.string().default(""),
  createdAt: z.string()
});

export const maintenanceIncidentSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  roomNumber: z.string(),
  title: z.string(),
  description: z.string().default(""),
  priority: maintenancePrioritySchema,
  status: maintenanceStatusSchema,
  assignee: z.string().default(""),
  reportedBy: z.string().default(""),
  locationLabel: z.string().default(""),
  impact: maintenanceImpactSchema.default("block_from_sale"),
  roomBlocked: z.boolean().default(false),
  resolutionNote: z.string().default(""),
  linkedHousekeepingTaskId: z.string().nullable().default(null),
  evidence: z.array(maintenanceEvidenceSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable().default(null)
});

export const maintenanceCreateSchema = z.object({
  roomId: z.string(),
  roomNumber: z.string(),
  title: z.string().min(2),
  description: z.string().default(""),
  priority: maintenancePrioritySchema.default("normal"),
  assignee: z.string().default(""),
  reportedBy: z.string().default(""),
  locationLabel: z.string().default(""),
  impact: maintenanceImpactSchema.default("block_from_sale"),
  roomBlocked: z.boolean().default(true),
  linkedHousekeepingTaskId: z.string().nullable().default(null),
  evidence: z.array(maintenanceEvidenceSchema).default([])
});

export const maintenanceUpdateSchema = z.object({
  status: maintenanceStatusSchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  assignee: z.string().optional(),
  description: z.string().optional(),
  roomBlocked: z.boolean().optional(),
  locationLabel: z.string().optional(),
  impact: maintenanceImpactSchema.optional(),
  resolutionNote: z.string().optional(),
  evidence: z.array(maintenanceEvidenceSchema).optional()
});

export type MaintenanceIncident = z.infer<typeof maintenanceIncidentSchema>;
export type MaintenancePriority = z.infer<typeof maintenancePrioritySchema>;
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;
export type MaintenanceImpact = z.infer<typeof maintenanceImpactSchema>;
export type MaintenanceEvidence = z.infer<typeof maintenanceEvidenceSchema>;
export type MaintenanceCreate = z.infer<typeof maintenanceCreateSchema>;
export type MaintenanceUpdate = z.infer<typeof maintenanceUpdateSchema>;
