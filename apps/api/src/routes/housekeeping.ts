import type { FastifyInstance } from "fastify";
import {
  housekeepingTaskCreateSchema,
  housekeepingTaskSummarySchema,
  housekeepingTaskUpdateSchema
} from "@hotel-crm/shared/housekeeping";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { createHousekeepingTask, listHousekeepingTasks, updateHousekeepingTask } from "../services/housekeepingStore";

export async function registerHousekeepingRoutes(app: FastifyInstance) {
  app.get("/housekeeping/tasks", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return housekeepingTaskSummarySchema.array().parse(await listHousekeepingTasks(propertyId));
  });

  app.post("/housekeeping/tasks", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = housekeepingTaskCreateSchema.parse(request.body);
    return reply.code(201).send(housekeepingTaskSummarySchema.parse(await createHousekeepingTask(propertyId, payload)));
  });

  app.patch<{ Params: { id: string } }>("/housekeeping/tasks/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = housekeepingTaskUpdateSchema.parse(request.body);
    const task = await updateHousekeepingTask(propertyId, request.params.id, payload);

    if (!task) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Task not found"
      });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/start", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, { status: "in_progress" });
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/pause", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, { status: "paused" });
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/request-inspection", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, {
      status: "inspection_requested",
      requestedInspection: true
    });
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/complete", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, { status: "completed" });
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/problem", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = housekeepingTaskUpdateSchema.parse(request.body ?? {});
    const task = await updateHousekeepingTask(propertyId, request.params.id, {
      ...payload,
      status: "problem_reported"
    });
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });

  app.post<{ Params: { id: string } }>("/housekeeping/tasks/:id/cancel", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const task = await updateHousekeepingTask(propertyId, request.params.id, { status: "cancelled" });
    if (!task) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Task not found" });
    }

    return housekeepingTaskSummarySchema.parse(task);
  });
}
