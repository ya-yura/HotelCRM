import { z } from "zod";

export const maintenancePrioritySchema = z.enum(["low", "normal", "high", "critical"]);
export const maintenanceStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "cancelled"
]);

export const maintenanceIncidentSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  roomNumber: z.string(),
  title: z.string(),
  description: z.string().default(""),
  priority: maintenancePrioritySchema,
  status: maintenanceStatusSchema,
  assignee: z.string().default(""),
  roomBlocked: z.boolean().default(false),
  createdAt: z.string(),
  resolvedAt: z.string().nullable().default(null)
});

export type MaintenanceIncident = z.infer<typeof maintenanceIncidentSchema>;
export type MaintenancePriority = z.infer<typeof maintenancePrioritySchema>;
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;
