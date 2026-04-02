import type { FastifyInstance } from "fastify";
import { stayRecordSchema } from "@hotel-crm/shared/stays";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { listStays } from "../services/stayStore";

export async function registerStayRoutes(app: FastifyInstance) {
  app.get("/stays", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return stayRecordSchema.array().parse(await listStays(propertyId));
  });
}
