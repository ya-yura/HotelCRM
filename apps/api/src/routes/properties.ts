import type { FastifyInstance } from "fastify";
import { propertySummarySchema, propertyUpdateRequestSchema } from "@hotel-crm/shared/properties";
import { requireRecentAuth, requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { getPropertyById, updateProperty } from "../services/propertyStore";

export async function registerPropertyRoutes(app: FastifyInstance) {
  app.get("/properties/current", async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const property = await getPropertyById(propertyId);
    if (!property) {
      return reply.code(404).send({
        code: "PROPERTY_NOT_FOUND",
        message: "Property not found"
      });
    }

    return propertySummarySchema.parse(property);
  });

  app.patch(
    "/properties/current",
    { preHandler: [requireRoles(["owner", "manager"]), requireRecentAuth()] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = propertyUpdateRequestSchema.parse(request.body);
      const property = await updateProperty(propertyId, payload);
      if (!property) {
        return reply.code(404).send({
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found"
        });
      }

      return propertySummarySchema.parse(property);
    }
  );
}
