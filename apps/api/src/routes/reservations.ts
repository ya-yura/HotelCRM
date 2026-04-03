import type { FastifyInstance } from "fastify";
import {
  reservationCheckInRequestSchema,
  reservationCreateSchema,
  reservationPaymentLinkRequestSchema,
  reservationSummarySchema,
  reservationUpdateSchema
} from "@hotel-crm/shared/reservations";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { appendAuditLog } from "../services/auditStore";
import {
  getReservationComplianceReadiness,
  maskSensitiveDocumentNumber,
  prepareComplianceSubmissions
} from "../services/complianceStore";
import { createPayment, createPaymentLink, getFolio, getFolioDetails } from "../services/paymentStore";
import { createHousekeepingTask } from "../services/housekeepingStore";
import {
  findReservationRoomConflict,
  createReservation,
  getReservation,
  listReservations,
  updateReservation
} from "../services/reservationStore";
import { getRoom, updateRoomStatus } from "../services/roomStore";
import { closeStay, createStay, getActiveStayByReservation } from "../services/stayStore";
import { getGuest, updateGuest } from "../services/guestStore";
import { getPropertyById } from "../services/propertyStore";

function roomIdFromLabel(roomLabel: string) {
  return `room_${roomLabel.toLowerCase()}`;
}

export async function registerReservationRoutes(app: FastifyInstance) {
  app.get("/reservations", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return reservationSummarySchema.array().parse(await listReservations(propertyId));
  });

  app.get<{ Params: { id: string } }>("/reservations/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const reservation = await getReservation(propertyId, request.params.id);
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    return reservationSummarySchema.parse(reservation);
  });

  app.post("/reservations", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const parsed = reservationCreateSchema.parse(request.body);
    const reservation = await createReservation(propertyId, parsed);
    await appendAuditLog(propertyId, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "reservation_created",
      reason: parsed.source === "walk_in" ? "Walk-in guest created from front desk" : "Created from booking flow"
    });

    return reply.code(201).send({
      ...reservation,
      syncStatus: "queued"
    });
  });

  app.patch<{ Params: { id: string } }>("/reservations/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = reservationUpdateSchema.parse(request.body);
    const current = await getReservation(propertyId, request.params.id);
    if (!current) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    if (payload.roomLabel && payload.roomLabel !== "UNASSIGNED") {
      const room = await getRoom(propertyId, roomIdFromLabel(payload.roomLabel));
      if (!room) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
      }
      if (["blocked_maintenance", "out_of_service", "occupied", "dirty", "cleaning"].includes(room.status)) {
        return reply.code(409).send({ code: "ROOM_NOT_READY", message: "Room is blocked or not ready" });
      }
      const conflict = await findReservationRoomConflict(
        propertyId,
        current.id,
        payload.roomLabel,
        payload.checkInDate ?? current.checkInDate,
        payload.checkOutDate ?? current.checkOutDate
      );
      if (conflict) {
        return reply.code(409).send({
          code: "ROOM_DATE_COLLISION",
          message: `Room already has booking ${conflict.id} on these dates`
        });
      }
    }

    const reservation = await updateReservation(propertyId, request.params.id, payload);
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    await appendAuditLog(propertyId, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "reservation_updated",
      reason: "Operational reservation card updated"
    });

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/confirm", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const reservation = await updateReservation(propertyId, request.params.id, { status: "confirmed" });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    await appendAuditLog(propertyId, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "reservation_confirmed",
      reason: "Manual confirmation"
    });

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/check-in", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = reservationCheckInRequestSchema.parse(request.body ?? {});
    const current = await getReservation(propertyId, request.params.id);
    if (!current) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    if (!["confirmed", "draft", "pending_confirmation"].includes(current.status)) {
      return reply.code(409).send({ code: "BUSINESS_RULE_VIOLATION", message: "Reservation cannot be checked in from current status" });
    }
    if (current.roomLabel === "UNASSIGNED") {
      return reply.code(409).send({ code: "ROOM_NOT_AVAILABLE", message: "Assign a room before check-in" });
    }

    const room = await getRoom(propertyId, roomIdFromLabel(current.roomLabel));
    if (!room) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
    }
    if (!["available", "reserved", "inspected"].includes(room.status)) {
      return reply.code(409).send({ code: "ROOM_NOT_READY", message: "Room is not ready for check-in" });
    }

    const property = await getPropertyById(propertyId);
    if (!property) {
      return reply.code(404).send({ code: "PROPERTY_NOT_FOUND", message: "Property not found" });
    }

    const readiness = await getReservationComplianceReadiness(propertyId, current.id);
    if (!readiness) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Compliance profile not found" });
    }
    if (!readiness.complianceReady) {
      return reply.code(409).send({
        code: "COMPLIANCE_BLOCKED",
        message: "Check-in blocked until required guest and compliance fields are fixed.",
        details: readiness.issues
      });
    }

    const guest = current.guestId ? await getGuest(propertyId, current.guestId) : null;

    if (payload.depositAmount && payload.depositAmount > 0) {
      await createPayment(propertyId, {
        reservationId: current.id,
        guestName: current.guestName,
        amount: payload.depositAmount,
        method: payload.paymentMethod ?? "card",
        provider: payload.paymentMethod === "sbp" ? "sbp" : payload.paymentMethod === "yookassa" ? "yookassa" : payload.paymentMethod === "tbank" ? "tbank" : "manual",
        kind: "deposit",
        note: "Deposit at check-in",
        reason: "Deposit captured at front desk",
        correlationId: `checkin_${current.id}`,
        paymentLinkId: null,
        idempotencyKey: `deposit_${current.id}_${Date.now()}`
      });
    }

    if (current.guestId && (current.guestPhone || current.guestEmail)) {
      await updateGuest(propertyId, current.guestId, {
        fullName: current.guestName,
        phone: current.guestPhone ?? "",
        email: current.guestEmail ?? ""
      });
    }

    const reservation = await updateReservation(propertyId, request.params.id, {
      status: "checked_in",
      depositAmount: (current.depositAmount ?? 0) + (payload.depositAmount ?? 0)
    });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    await createStay(propertyId, {
      reservationId: reservation.id,
      guestId: reservation.guestId ?? "",
      roomId: roomIdFromLabel(reservation.roomLabel),
      roomLabel: reservation.roomLabel,
      guestName: reservation.guestName,
      citizenship: guest?.citizenship ?? "RU",
      purposeOfVisit: guest?.arrivalPurpose ?? "tourism",
      documentNumberMasked: maskSensitiveDocumentNumber(guest?.document?.number),
      migrationRegistrationStatus: "ready"
    });
    const complianceKinds = [
      ...(property.complianceSettings.autoPrepareMvdSubmission ? ["mvd" as const] : []),
      ...(property.complianceSettings.autoPrepareRosstatSubmission ? ["rosstat" as const] : [])
    ];
    if (complianceKinds.length > 0) {
      await prepareComplianceSubmissions(propertyId, reservation.id, complianceKinds);
    }
    await updateRoomStatus(propertyId, roomIdFromLabel(reservation.roomLabel), "occupied");
    await appendAuditLog(propertyId, {
      entityType: "stay",
      entityId: reservation.id,
      action: "checked_in",
      reason: payload.depositAmount ? `Guest checked in with deposit ${payload.depositAmount}` : "Guest checked in"
    });

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/check-out", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const current = await getReservation(propertyId, request.params.id);
    if (!current) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    if (current.status !== "checked_in") {
      return reply.code(409).send({ code: "BUSINESS_RULE_VIOLATION", message: "Reservation must be checked in before checkout" });
    }
    if (!(await getActiveStayByReservation(propertyId, current.id))) {
      return reply.code(409).send({ code: "BUSINESS_RULE_VIOLATION", message: "No active stay exists for checkout" });
    }
    const folio = await getFolio(propertyId, current.id);
    if ((folio?.balanceDue ?? current.balanceDue) > 0) {
      return reply.code(409).send({ code: "BALANCE_DUE_BLOCK", message: "Outstanding balance must be settled before checkout" });
    }

    const reservation = await updateReservation(propertyId, request.params.id, { status: "checked_out" });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    await closeStay(propertyId, reservation.id);
    await updateRoomStatus(propertyId, roomIdFromLabel(reservation.roomLabel), "dirty");
    await createHousekeepingTask(propertyId, {
      id: `task_${reservation.id}_checkout`,
      roomId: roomIdFromLabel(reservation.roomLabel),
      roomNumber: reservation.roomLabel,
      priority: "urgent",
      status: "queued",
      taskType: "checkout_clean",
      note: "Auto-created after checkout",
      dueLabel: "Before next arrival",
      assigneeName: "",
      shiftLabel: "Next shift",
      problemNote: "",
      requestedInspection: false,
      checklist: [
        { label: "Refresh bathroom", done: false },
        { label: "Change linen", done: false }
      ],
      evidence: [],
      consumables: []
    });
    await appendAuditLog(propertyId, {
      entityType: "stay",
      entityId: reservation.id,
      action: "checked_out",
      reason: "Guest checked out and cleaning task created"
    });

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/cancel", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const reservation = await updateReservation(propertyId, request.params.id, { status: "cancelled" });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    await appendAuditLog(propertyId, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "reservation_cancelled",
      reason: "Manual cancellation"
    });

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/no-show", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const reservation = await updateReservation(propertyId, request.params.id, { status: "no_show" });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    await appendAuditLog(propertyId, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "reservation_no_show",
      reason: "Marked as no-show"
    });

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/reassign-room", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const roomLabel = (request.body as { roomLabel?: string } | undefined)?.roomLabel ?? "UNASSIGNED";
    const current = await getReservation(propertyId, request.params.id);
    if (!current) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    if (roomLabel !== "UNASSIGNED") {
      const roomId = roomIdFromLabel(roomLabel);
      const room = await getRoom(propertyId, roomId);
      if (!room) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
      }
      if (!["available", "reserved", "inspected"].includes(room.status)) {
        return reply.code(409).send({ code: "ROOM_NOT_READY", message: "Room is not ready for assignment" });
      }
      const conflict = await findReservationRoomConflict(
        propertyId,
        current.id,
        roomLabel,
        current.checkInDate,
        current.checkOutDate
      );
      if (conflict) {
        return reply.code(409).send({ code: "ROOM_DATE_COLLISION", message: `Room already occupied by ${conflict.guestName}` });
      }
      await updateRoomStatus(propertyId, roomId, "reserved");
    }

    const reservation = await updateReservation(propertyId, request.params.id, { roomLabel });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    await appendAuditLog(propertyId, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "room_reassigned",
      reason: `Room changed to ${roomLabel}`
    });

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/payment-link", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = reservationPaymentLinkRequestSchema.parse(request.body ?? {});
    const current = await getReservation(propertyId, request.params.id);
    if (!current) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    const folio = await getFolioDetails(propertyId, request.params.id);
    const amount = payload.amount ?? Math.max(folio?.balanceDue ?? current.balanceDue, 0);
    if (amount <= 0) {
      return reply.code(409).send({ code: "BALANCE_ALREADY_SETTLED", message: "No balance available for payment link" });
    }

    await createPaymentLink(propertyId, {
      reservationId: current.id,
      guestName: current.guestName,
      amount,
      method: payload.method,
      note: `Sent via ${payload.channel}`,
      correlationId: `link_${current.id}_${Date.now()}`
    });

    const reservation = await updateReservation(propertyId, request.params.id, {
      paymentLinkSentAt: new Date().toISOString()
    });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    await appendAuditLog(propertyId, {
      entityType: "payment",
      entityId: reservation.id,
      action: "payment_link_sent",
      reason: `Payment link sent via ${payload.channel} using ${payload.method} for ${amount}`
    });

    return reservationSummarySchema.parse(reservation);
  });
}
