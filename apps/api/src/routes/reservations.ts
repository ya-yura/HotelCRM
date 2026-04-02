import type { FastifyInstance } from "fastify";
import { reservationCreateSchema, reservationSummarySchema } from "@hotel-crm/shared/reservations";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { appendAuditLog } from "../services/auditStore";
import { createReservation, getReservation, listReservations, updateReservation } from "../services/reservationStore";
import { getFolio } from "../services/paymentStore";
import { getRoom, updateRoomStatus } from "../services/roomStore";
import { closeStay, createStay, getActiveStayByReservation } from "../services/stayStore";

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
      reason: "Created from quick reservation flow"
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
    const reservation = await updateReservation(propertyId, request.params.id, request.body as Partial<{
      guestName: string;
      roomLabel: string;
      checkInDate: string;
      checkOutDate: string;
      status: "draft" | "pending_confirmation" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
      balanceDue: number;
    }>);
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }

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
    const current = await getReservation(propertyId, request.params.id);
    if (!current) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    if (current.status !== "confirmed") {
      return reply.code(409).send({ code: "BUSINESS_RULE_VIOLATION", message: "Reservation must be confirmed before check-in" });
    }
    if (current.roomLabel === "UNASSIGNED") {
      return reply.code(409).send({ code: "ROOM_NOT_AVAILABLE", message: "Assign a room before check-in" });
    }

    const room = await getRoom(propertyId, `room_${current.roomLabel.toLowerCase()}`);
    if (!room) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
    }
    if (!["available", "reserved", "inspected"].includes(room.status)) {
      return reply.code(409).send({ code: "ROOM_NOT_READY", message: "Room is not ready for check-in" });
    }

    const reservation = await updateReservation(propertyId, request.params.id, { status: "checked_in" });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    await createStay(propertyId, {
      reservationId: reservation.id,
      roomId: `room_${reservation.roomLabel.toLowerCase()}`,
      roomLabel: reservation.roomLabel,
      guestName: reservation.guestName
    });
    await updateRoomStatus(propertyId, `room_${reservation.roomLabel.toLowerCase()}`, "occupied");
    await appendAuditLog(propertyId, {
      entityType: "stay",
      entityId: reservation.id,
      action: "checked_in",
      reason: "Guest checked in"
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
    await updateRoomStatus(propertyId, `room_${reservation.roomLabel.toLowerCase()}`, "dirty");
    await appendAuditLog(propertyId, {
      entityType: "stay",
      entityId: reservation.id,
      action: "checked_out",
      reason: "Guest checked out"
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

    return reservationSummarySchema.parse(reservation);
  });

  app.post<{ Params: { id: string } }>("/reservations/:id/reassign-room", { preHandler: requireRoles(["owner", "manager", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const roomLabel = (request.body as { roomLabel?: string } | undefined)?.roomLabel ?? "UNASSIGNED";
    const roomId = `room_${roomLabel.toLowerCase()}`;
    const room = await getRoom(propertyId, roomId);
    if (roomLabel !== "UNASSIGNED" && !room) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
    }
    if (room && !["available", "reserved", "inspected"].includes(room.status)) {
      return reply.code(409).send({ code: "ROOM_NOT_READY", message: "Room is not ready for assignment" });
    }
    const reservation = await updateReservation(propertyId, request.params.id, { roomLabel });
    if (!reservation) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
    }
    if (room) {
      await updateRoomStatus(propertyId, roomId, "reserved");
    }
    await appendAuditLog(propertyId, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "room_reassigned",
      reason: `Room changed to ${roomLabel}`
    });

    return reservationSummarySchema.parse(reservation);
  });
}
