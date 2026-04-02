import type { FastifyInstance } from "fastify";
import {
  azBookingCreateSchema,
  azBookingUpdateSchema,
  azBookingViewSchema
} from "@hotel-crm/shared/features/azhotel_core";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  createAzBooking,
  getAzBooking,
  listAzBookings,
  updateAzBooking
} from "../services/azBookingsStore";

export async function registerAzBookingRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/azhotel/bookings",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      return azBookingViewSchema
        .array()
        .parse(await listAzBookings(propertyId, request.query.from, request.query.to));
    }
  );

  app.get<{ Params: { id: string } }>(
    "/azhotel/bookings/:id",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const booking = await getAzBooking(propertyId, request.params.id);
      if (!booking) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Бронь не найдена" });
      }
      return azBookingViewSchema.parse(booking);
    }
  );

  app.post(
    "/azhotel/bookings",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azBookingCreateSchema.parse(request.body);
      const booking = await createAzBooking(propertyId, payload);
      if (booking === false) {
        return reply.code(409).send({
          code: "ROOM_ALREADY_BOOKED",
          message: "На эти даты номер уже занят"
        });
      }

      return reply.code(201).send(azBookingViewSchema.parse(booking));
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/azhotel/bookings/:id",
    { preHandler: requireRoles(["owner", "frontdesk"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azBookingUpdateSchema.parse(request.body);
      const booking = await updateAzBooking(propertyId, request.params.id, payload);
      if (booking === false) {
        return reply.code(409).send({
          code: "ROOM_ALREADY_BOOKED",
          message: "На эти даты номер уже занят"
        });
      }
      if (!booking) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Бронь не найдена" });
      }

      return azBookingViewSchema.parse(booking);
    }
  );
}
