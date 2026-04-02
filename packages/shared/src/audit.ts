import { z } from "zod";

export const auditLogSchema = z.object({
  id: z.string(),
  entityType: z.enum(["reservation", "room", "stay", "payment", "sync", "auth", "property", "user"]),
  entityId: z.string(),
  action: z.string(),
  reason: z.string(),
  createdAt: z.string()
});

export type AuditLog = z.infer<typeof auditLogSchema>;
