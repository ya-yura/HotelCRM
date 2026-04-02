import type { FastifyInstance } from "fastify";
import {
  housekeepingTaskSummarySchema,
  housekeepingTaskUpdateSchema
} from "@hotel-crm/shared/housekeeping";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { createHousekeepingTask, listHousekeepingTasks, updateHousekeepingTask } from "../services/housekeepingStore";

export async function registerHousekeepingRoutes(app: FastifyInstance) {
  app.get("/housekeeping/tasks", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return housekeepingTaskSummarySchema.array().parse(await listHousekeepingTasks(propertyId));
  });

  app.post("/housekeeping/tasks", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = housekeepingTaskSummarySchema.parse(request.body);
    return reply.code(201).send(housekeepingTaskSummarySchema.parse(await createHousekeepingTask(propertyId, payload)));
  });

  app.patch<{ Params: { id: string } }>("/housekeeping/tasks/:id", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = housekeepingTaskUpdateSchema.parse(request.body);
    const task = await updateHousekeepingTask(propertyId, request.params.id, payload.status);

    if (!task) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Task not found"
      });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/start", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, "in_progress");
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/complete", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, "completed");
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/cancel", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, "cancelled");
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });
}
