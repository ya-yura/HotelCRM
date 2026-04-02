import type { FastifyInstance } from "fastify";
import {
  guestDuplicateCandidateSchema,
  guestMergeRequestSchema,
  guestMergeResultSchema,
  guestProfileSchema,
  guestUpsertSchema
} from "@hotel-crm/shared/guests";
import { requireRecentAuth, requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  findGuestDuplicates,
  getGuest,
  listGuests,
  mergeGuests,
  updateGuest
} from "../services/guestStore";
import { appendAuditLog } from "../services/auditStore";

export async function registerGuestRoutes(app: FastifyInstance) {
  app.get("/guests", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    return guestProfileSchema.array().parse(await listGuests(propertyId));
  });

  app.get<{ Params: { id: string } }>("/guests/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const guest = await getGuest(propertyId, request.params.id);
    if (!guest) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Guest not found" });
    }

    return guestProfileSchema.parse(guest);
  });

  app.get<{ Params: { id: string } }>("/guests/:id/duplicates", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    return guestDuplicateCandidateSchema.array().parse(
      await findGuestDuplicates(propertyId, request.params.id)
    );
  });

  app.patch<{ Params: { id: string } }>("/guests/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = guestUpsertSchema.partial().parse(request.body);
    const guest = await updateGuest(propertyId, request.params.id, payload);
    if (!guest) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Guest not found" });
    }

    await appendAuditLog(propertyId, {
      entityType: "user",
      entityId: guest.id,
      action: "guest_updated",
      reason: "Guest card updated from front desk flow"
    });

    return guestProfileSchema.parse(guest);
  });

  app.post("/guests/merge", { preHandler: [requireRoles(["owner", "manager"]), requireRecentAuth()] }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = guestMergeRequestSchema.parse(request.body);
    const result = await mergeGuests(propertyId, payload.primaryGuestId, payload.duplicateGuestId);
    if (!result) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Guest pair not found" });
    }

    await appendAuditLog(propertyId, {
      entityType: "user",
      entityId: result.primaryGuest.id,
      action: "guest_merged",
      reason: `Guest ${result.mergedGuestId} merged into primary profile`
    });

    return guestMergeResultSchema.parse(result);
  });
}
