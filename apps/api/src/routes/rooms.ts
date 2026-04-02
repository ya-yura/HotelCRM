import type { FastifyInstance } from "fastify";
import { roomCreateSchema, roomStatusUpdateSchema, roomSummarySchema } from "@hotel-crm/shared/rooms";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { createRoom, getRoom, listRooms, updateRoomStatus } from "../services/roomStore";

export async function registerRoomRoutes(app: FastifyInstance) {
  app.get("/rooms", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return roomSummarySchema.array().parse(await listRooms(propertyId));
  });

  app.post("/rooms", { preHandler: requireRoles(["owner", "manager"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = roomCreateSchema.parse(request.body);
    const room = await createRoom(propertyId, payload);
    if (!room) {
      return reply.code(409).send({
        code: "ROOM_NUMBER_TAKEN",
        message: "Room number already exists"
      });
    }

    return reply.code(201).send(roomSummarySchema.parse(room));
  });

  app.get<{ Params: { id: string } }>("/rooms/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const room = await getRoom(propertyId, request.params.id);
    if (!room) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
    }

    return roomSummarySchema.parse(room);
  });

  app.patch<{ Params: { id: string } }>("/rooms/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = roomStatusUpdateSchema.parse(request.body);
    const room = await updateRoomStatus(propertyId, request.params.id, payload.status);

    if (!room) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Room not found"
      });
    }

    return roomSummarySchema.parse(room);
  });

  app.post<{ Params: { id: string } }>("/rooms/:id/block", { preHandler: requireRoles(["owner", "manager", "frontdesk", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const room = await updateRoomStatus(propertyId, request.params.id, "blocked_maintenance");
    if (!room) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
    }

    return roomSummarySchema.parse(room);
  });

  app.post<{ Params: { id: string } }>("/rooms/:id/return-to-service", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const room = await updateRoomStatus(propertyId, request.params.id, "available");
    if (!room) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Room not found" });
    }

    return roomSummarySchema.parse(room);
  });
}
