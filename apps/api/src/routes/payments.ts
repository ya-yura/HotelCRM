import type { FastifyInstance } from "fastify";
import {
  createPaymentLinkSchema,
  createChargeSchema,
  createPaymentSchema,
  folioCorrectionSchema,
  folioDetailsSchema,
  folioSummarySchema,
  paymentRefundSchema,
  paymentLinkSchema,
  paymentRecordSchema
} from "@hotel-crm/shared/payments";
import { z } from "zod";
import { requireRecentAuth, requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  createCharge,
  createCorrection,
  createPaymentLink,
  createPayment,
  getFolioDetails,
  getPayment,
  listFolioDetails,
  listFolios,
  listPayments,
  refundPayment,
  voidPayment
} from "../services/paymentStore";
import { appendAuditLog } from "../services/auditStore";

export async function registerPaymentRoutes(app: FastifyInstance) {
  const paymentVoidSchema = z.object({
    reason: z.string().min(2),
    correlationId: z.string().default("")
  });

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
    await appendAuditLog(propertyId, {
      entityType: "payment",
      entityId: created.charge.id,
      action: "folio_charge_created",
      reason: payload.reason || payload.description,
      actor: request.authSession?.userName,
      correlationId: payload.correlationId
    });

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
    await appendAuditLog(propertyId, {
      entityType: "payment",
      entityId: created.payment.id,
      action: "payment_recorded",
      reason: payload.reason || payload.note || `Payment via ${payload.method}`,
      actor: request.authSession?.userName,
      correlationId: payload.correlationId
    });

    return reply.code(201).send({
      payment: paymentRecordSchema.parse(created.payment),
      folio: folioDetailsSchema.parse(created.folio)
    });
  });

  app.post("/payments/links", { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = createPaymentLinkSchema.parse(request.body);
    const created = await createPaymentLink(propertyId, payload);
    await appendAuditLog(propertyId, {
      entityType: "payment",
      entityId: created.paymentLink.id,
      action: "payment_link_created",
      reason: `Remote payment link via ${payload.method} for ${payload.amount}`,
      actor: request.authSession?.userName,
      correlationId: payload.correlationId
    });

    return reply.code(201).send({
      paymentLink: paymentLinkSchema.parse(created.paymentLink),
      folio: folioDetailsSchema.parse(created.folio)
    });
  });

  app.post("/payments/corrections", { preHandler: [requireRoles(["owner", "manager", "accountant"]), requireRecentAuth()] }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = folioCorrectionSchema.parse(request.body);
    const created = await createCorrection(propertyId, payload);
    await appendAuditLog(propertyId, {
      entityType: "payment",
      entityId: created.charge.id,
      action: "folio_corrected",
      reason: payload.reason,
      actor: request.authSession?.userName,
      correlationId: payload.correlationId
    });

    return reply.code(201).send({
      charge: created.charge,
      folio: folioDetailsSchema.parse(created.folio)
    });
  });

  app.post<{ Params: { id: string } }>("/payments/:id/refund", { preHandler: [requireRoles(["owner", "manager", "accountant"]), requireRecentAuth()] }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payment = await getPayment(propertyId, request.params.id);
    if (!payment) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Payment not found" });
    }

    const payload = paymentRefundSchema.parse(request.body);
    const refund = await refundPayment(propertyId, request.params.id, {
      amount: payload.amount,
      reason: payload.reason,
      correlationId: payload.correlationId
    });
    if (!refund) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Payment not found" });
    }
    await appendAuditLog(propertyId, {
      entityType: "payment",
      entityId: refund.payment.id,
      action: "payment_refunded",
      reason: payload.reason,
      actor: request.authSession?.userName,
      correlationId: payload.correlationId
    });
    return reply.code(201).send({
      payment: paymentRecordSchema.parse(refund.payment),
      folio: folioDetailsSchema.parse(refund.folio)
    });
  });

  app.post<{ Params: { id: string } }>("/payments/:id/void", { preHandler: [requireRoles(["owner", "manager", "accountant"]), requireRecentAuth()] }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payment = await getPayment(propertyId, request.params.id);
    if (!payment) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Payment not found" });
    }

    const payload = paymentVoidSchema.parse(request.body);
    const reversal = await voidPayment(propertyId, request.params.id, payload.reason, payload.correlationId);
    if (!reversal) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Payment not found" });
    }
    await appendAuditLog(propertyId, {
      entityType: "payment",
      entityId: reversal.payment.id,
      action: "payment_voided",
      reason: payload.reason,
      actor: request.authSession?.userName,
      correlationId: payload.correlationId
    });

    return reply.code(201).send({
      payment: paymentRecordSchema.parse(reversal.payment),
      folio: folioDetailsSchema.parse(reversal.folio)
    });
  });
}
