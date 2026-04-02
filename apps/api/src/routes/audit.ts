import type { FastifyInstance } from "fastify";
import { auditLogSchema } from "@hotel-crm/shared/audit";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { listAuditLogs } from "../services/auditStore";

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get("/audit/logs", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return auditLogSchema.array().parse(await listAuditLogs(propertyId));
  });
}
