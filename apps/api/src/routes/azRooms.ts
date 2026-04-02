import type { FastifyInstance } from "fastify";
import {
  azRoomCreateSchema,
  azRoomSchema,
  azRoomUpdateSchema
} from "@hotel-crm/shared/features/azhotel_core";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  createAzRoom,
  deleteAzRoom,
  getAzRoom,
  listAzRooms,
  updateAzRoom
} from "../services/azRoomsStore";

export async function registerAzRoomRoutes(app: FastifyInstance) {
  app.get(
    "/azhotel/rooms",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "maintenance"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }
      return azRoomSchema.array().parse(await listAzRooms(propertyId));
    }
  );

  app.get<{ Params: { id: string } }>(
    "/azhotel/rooms/:id",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "maintenance"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }
      const room = await getAzRoom(propertyId, request.params.id);
      if (!room) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Номер не найден" });
      }
      return azRoomSchema.parse(room);
    }
  );

  app.post(
    "/azhotel/rooms",
    { preHandler: requireRoles(["owner", "manager"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }
      const payload = azRoomCreateSchema.parse(request.body);
      const room = await createAzRoom(propertyId, payload);
      if (!room) {
        return reply.code(409).send({
          code: "ROOM_NUMBER_TAKEN",
          message: "Номер с таким номером уже существует"
        });
      }
      return reply.code(201).send(azRoomSchema.parse(room));
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/azhotel/rooms/:id",
    { preHandler: requireRoles(["owner", "manager"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }
      const payload = azRoomUpdateSchema.parse(request.body);
      const room = await updateAzRoom(propertyId, request.params.id, payload);
      if (room === false) {
        return reply.code(409).send({
          code: "ROOM_NUMBER_TAKEN",
          message: "Номер с таким номером уже существует"
        });
      }
      if (!room) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Номер не найден" });
      }
      return azRoomSchema.parse(room);
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/azhotel/rooms/:id",
    { preHandler: requireRoles(["owner", "manager"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }
      const deleted = await deleteAzRoom(propertyId, request.params.id);
      if (deleted === false) {
        return reply.code(409).send({
          code: "ROOM_IN_USE",
          message: "Номер нельзя удалить: к нему уже привязаны брони"
        });
      }
      if (deleted === null) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Номер не найден" });
      }
      return reply.code(204).send();
    }
  );
}
