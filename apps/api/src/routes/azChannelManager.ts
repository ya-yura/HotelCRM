import type { FastifyInstance } from "fastify";
import {
  azChannelDashboardSchema,
  azChannelSyncRequestSchema,
  azChannelSyncResultSchema
} from "@hotel-crm/shared/features/azhotel_core";
import { requireAzAccess, requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  getAzChannelDashboard,
  getChannelManagerMockNote,
  syncAzChannelData
} from "../services/azChannelManagerStore";

export async function registerAzChannelManagerRoutes(app: FastifyInstance) {
  app.get(
    "/azhotel/channel-manager",
    { preHandler: [requireRoles(["owner", "frontdesk"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      return {
        dashboard: azChannelDashboardSchema.parse(await getAzChannelDashboard(propertyId)),
        mock: getChannelManagerMockNote()
      };
    }
  );

  app.post(
    "/azhotel/channel-manager/sync-inventory",
    { preHandler: [requireRoles(["owner", "frontdesk"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azChannelSyncRequestSchema.parse(request.body);
      return azChannelSyncResultSchema.parse(await syncAzChannelData(propertyId, "inventory", payload));
    }
  );

  app.post(
    "/azhotel/channel-manager/sync-prices",
    { preHandler: [requireRoles(["owner", "frontdesk"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azChannelSyncRequestSchema.parse(request.body);
      return azChannelSyncResultSchema.parse(await syncAzChannelData(propertyId, "prices", payload));
    }
  );
}
