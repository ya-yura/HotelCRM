import type { FastifyInstance } from "fastify";
import { syncConflictSchema, syncQueueItemSchema } from "@hotel-crm/shared/sync";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { enqueueSyncItems, listSyncConflicts, listSyncQueue, resolveSyncConflict } from "../services/syncStore";

export async function registerSyncRoutes(app: FastifyInstance) {
  app.post("/sync/events/batch", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = syncQueueItemSchema.array().parse(request.body);
    return syncQueueItemSchema.array().parse(await enqueueSyncItems(propertyId, payload));
  });

  app.get("/sync/conflicts", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return syncConflictSchema.array().parse(await listSyncConflicts(propertyId));
  });

  app.post<{ Params: { id: string } }>("/sync/conflicts/:id/resolve", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const resolved = await resolveSyncConflict(propertyId, request.params.id);
    if (!resolved) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Conflict not found"
      });
    }

    return syncConflictSchema.parse(resolved);
  });
}
