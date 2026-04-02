import type { FastifyInstance } from "fastify";
import {
  createChargeSchema,
  createPaymentSchema,
  folioDetailsSchema,
  folioSummarySchema,
  paymentRecordSchema
} from "@hotel-crm/shared/payments";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  createCharge,
  createPayment,
  getFolioDetails,
  getPayment,
  listFolioDetails,
  listFolios,
  listPayments,
  negatePayment
} from "../services/paymentStore";

export async function registerPaymentRoutes(app: FastifyInstance) {
  app.get("/payments", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return paymentRecordSchema.array().parse(await listPayments(propertyId));
  });

  app.get("/payments/folios", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return folioSummarySchema.array().parse(await listFolios(propertyId));
  });

  app.get("/payments/folio-details", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return folioDetailsSchema.array().parse(await listFolioDetails(propertyId));
  });

  app.get<{ Params: { reservationId: string } }>("/payments/folios/:reservationId", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const folio = await getFolioDetails(propertyId, request.params.reservationId);
    if (!folio) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Folio not found" });
    }
    return folioDetailsSchema.parse(folio);
  });

  app.post("/payments/charges", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = createChargeSchema.parse(request.body);
    const created = await createCharge(propertyId, payload);

    return reply.code(201).send({
      charge: created.charge,
      folio: folioDetailsSchema.parse(created.folio)
    });
  });

  app.post("/payments", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = createPaymentSchema.parse(request.body);
    const created = await createPayment(propertyId, payload);

    return reply.code(201).send({
      payment: paymentRecordSchema.parse(created.payment),
      folio: folioDetailsSchema.parse(created.folio)
    });
  });

  app.post<{ Params: { id: string } }>("/payments/:id/refund", { preHandler: requireRoles(["owner", "manager", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payment = await getPayment(propertyId, request.params.id);
    if (!payment) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Payment not found" });
    }

    const reversal = await negatePayment(propertyId, request.params.id, `Refund for ${payment.guestName}`);
    return paymentRecordSchema.parse(reversal);
  });

  app.post<{ Params: { id: string } }>("/payments/:id/void", { preHandler: requireRoles(["owner", "manager", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payment = await getPayment(propertyId, request.params.id);
    if (!payment) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Payment not found" });
    }

    const reversal = await negatePayment(propertyId, request.params.id, `Void for ${payment.guestName}`);
    return paymentRecordSchema.parse(reversal);
  });
}
