import type { FastifyInstance } from "fastify";
import {
  azCheckInRequestSchema,
  azCheckOutRequestSchema,
  azSettlementSchema
} from "@hotel-crm/shared/features/azhotel_core";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  executeAzCheckIn,
  executeAzCheckOut,
  quoteAzCheckIn,
  quoteAzCheckOut
} from "../services/azFrontdeskStore";

function sendFrontdeskError(
  reply: { code: (statusCode: number) => { send: (body: unknown) => unknown } },
  result: false | "ROOM_NOT_READY" | "ROOM_ALREADY_BOOKED" | "INVALID_STATUS" | null
) {
  if (result === null) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Бронь не найдена" });
  }

  if (result === false) {
    return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Номер не найден" });
  }

  if (result === "ROOM_NOT_READY") {
    return reply.code(409).send({ code: "ROOM_NOT_READY", message: "Номер ещё не готов к заселению" });
  }

  if (result === "INVALID_STATUS") {
    return reply.code(409).send({ code: "INVALID_STATUS", message: "Бронь нельзя провести через этот сценарий в текущем статусе" });
  }

  return reply.code(409).send({ code: "ROOM_ALREADY_BOOKED", message: "Этот номер уже занят на даты брони" });
}

export async function registerAzFrontdeskRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    "/azhotel/bookings/:id/check-in/quote",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azCheckInRequestSchema.parse(request.body);
      const quote = await quoteAzCheckIn(propertyId, request.params.id, payload.roomId, payload.services);
      if (!quote || typeof quote === "string") {
        return sendFrontdeskError(reply, quote);
      }

      return azSettlementSchema.parse(quote);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/azhotel/bookings/:id/check-in",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azCheckInRequestSchema.parse(request.body);
      const result = await executeAzCheckIn(propertyId, request.params.id, payload.roomId, payload.services);
      if (!result || typeof result === "string") {
        return sendFrontdeskError(reply, result);
      }

      return azSettlementSchema.parse(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/azhotel/bookings/:id/check-out/quote",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azCheckOutRequestSchema.parse(request.body);
      const quote = await quoteAzCheckOut(propertyId, request.params.id, payload.services);
      if (!quote || quote === "INVALID_STATUS") {
        return sendFrontdeskError(reply, quote);
      }

      return azSettlementSchema.parse(quote);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/azhotel/bookings/:id/check-out",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azCheckOutRequestSchema.parse(request.body);
      const result = await executeAzCheckOut(propertyId, request.params.id, payload.services);
      if (!result || result === "INVALID_STATUS") {
        return sendFrontdeskError(reply, result);
      }

      return azSettlementSchema.parse(result);
    }
  );
}
