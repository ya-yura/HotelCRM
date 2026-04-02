import type { FastifyInstance } from "fastify";
import {
  azChannelBookingIngestSchema,
  azChannelDashboardSchema,
  azChannelSyncRequestSchema,
  azChannelSyncResultSchema
} from "@hotel-crm/shared/features/azhotel_core";
import { requireAzAccess, requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  getAzChannelDashboard,
  getChannelManagerMockNote,
  ingestAzChannelBooking,
  pullAzChannelBookings,
  syncAzChannelData
} from "../services/azChannelManagerStore";
import { reservationSummarySchema } from "@hotel-crm/shared/reservations";

export async function registerAzChannelManagerRoutes(app: FastifyInstance) {
  app.get(
    "/azhotel/channel-manager",
    { preHandler: [requireRoles(["owner", "manager", "frontdesk"]), requireAzAccess(["admin"])] },
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
    { preHandler: [requireRoles(["owner", "manager", "frontdesk"]), requireAzAccess(["admin"])] },
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
    { preHandler: [requireRoles(["owner", "manager", "frontdesk"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azChannelSyncRequestSchema.parse(request.body);
      return azChannelSyncResultSchema.parse(await syncAzChannelData(propertyId, "prices", payload));
    }
  );

  app.post(
    "/azhotel/channel-manager/sync-bookings",
    { preHandler: [requireRoles(["owner", "manager", "frontdesk"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azChannelSyncRequestSchema.parse(request.body);
      return azChannelSyncResultSchema.parse(await pullAzChannelBookings(propertyId, payload));
    }
  );

  app.post(
    "/azhotel/channel-manager/ingest-booking",
    { preHandler: [requireRoles(["owner", "manager", "frontdesk"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azChannelBookingIngestSchema.parse(request.body);
      const booking = await ingestAzChannelBooking(propertyId, payload);
      if (booking === false) {
        return reply.code(409).send({
          code: "OVERBOOKING_GUARD",
          message: "Квота по типу номера исчерпана, OTA-бронь отправлена на ручную проверку"
        });
      }
      return reply.code(201).send(reservationSummarySchema.parse(booking));
    }
  );
}
