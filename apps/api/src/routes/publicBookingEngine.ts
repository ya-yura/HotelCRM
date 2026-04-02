import type { FastifyInstance } from "fastify";
import {
  azDirectAvailabilityRequestSchema,
  azDirectAvailabilityResponseSchema,
  azDirectBookingConfirmationSchema,
  azDirectProvisionalReservationRequestSchema,
  azDirectQuoteRequestSchema,
  azDirectQuoteSchema
} from "@hotel-crm/shared/features/azhotel_core";
import {
  confirmDirectReservation,
  createDirectProvisionalReservation,
  createDirectQuote,
  requestDirectAvailability
} from "../services/bookingEngineStore";

export async function registerPublicBookingEngineRoutes(app: FastifyInstance) {
  app.post<{ Params: { propertyId: string } }>(
    "/public/properties/:propertyId/booking-engine/availability",
    async (request, reply) => {
      const payload = azDirectAvailabilityRequestSchema.parse(request.body);
      return azDirectAvailabilityResponseSchema.parse(
        await requestDirectAvailability(request.params.propertyId, payload)
      );
    }
  );

  app.post<{ Params: { propertyId: string } }>(
    "/public/properties/:propertyId/booking-engine/quote",
    async (request, reply) => {
      const payload = azDirectQuoteRequestSchema.parse(request.body);
      const quote = await createDirectQuote(request.params.propertyId, payload);
      if (!quote) {
        return reply.code(409).send({
          code: "NO_INVENTORY",
          message: "На выбранные даты нет доступного инвентаря"
        });
      }
      return reply.code(201).send(azDirectQuoteSchema.parse(quote));
    }
  );

  app.post<{ Params: { propertyId: string } }>(
    "/public/properties/:propertyId/booking-engine/provisional-reservations",
    async (request, reply) => {
      const payload = azDirectProvisionalReservationRequestSchema.parse(request.body);
      const provisional = await createDirectProvisionalReservation(request.params.propertyId, payload);
      if (!provisional) {
        return reply.code(409).send({
          code: "QUOTE_EXPIRED_OR_UNAVAILABLE",
          message: "Квота уже занята или оффер истёк"
        });
      }
      return reply.code(201).send(azDirectBookingConfirmationSchema.parse(provisional));
    }
  );

  app.post<{ Params: { propertyId: string; reservationId: string } }>(
    "/public/properties/:propertyId/booking-engine/provisional-reservations/:reservationId/confirm",
    async (request, reply) => {
      const confirmation = await confirmDirectReservation(request.params.propertyId, request.params.reservationId);
      if (!confirmation) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Временное бронирование не найдено"
        });
      }
      return azDirectBookingConfirmationSchema.parse(confirmation);
    }
  );
}
