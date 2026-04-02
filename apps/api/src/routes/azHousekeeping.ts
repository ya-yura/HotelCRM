import type { FastifyInstance } from "fastify";
import {
  azHousekeepingDashboardSchema,
  azHousekeepingTaskUpdateSchema,
  azHousekeepingTaskViewSchema
} from "@hotel-crm/shared/features/azhotel_core";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  getAzHousekeepingDashboard,
  listAzHousekeepingTasks,
  updateAzHousekeepingTask
} from "../services/azHousekeepingStore";

export async function registerAzHousekeepingRoutes(app: FastifyInstance) {
  app.get(
    "/azhotel/housekeeping/dashboard",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const assigneeFilter =
        request.authSession?.azAccessRole === "staff" ? request.authSession.userName : undefined;
      return azHousekeepingDashboardSchema.parse(await getAzHousekeepingDashboard(propertyId, assigneeFilter));
    }
  );

  app.get(
    "/azhotel/housekeeping/tasks",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const assigneeFilter =
        request.authSession?.azAccessRole === "staff" ? request.authSession.userName : undefined;
      return azHousekeepingTaskViewSchema.array().parse(await listAzHousekeepingTasks(propertyId, assigneeFilter));
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/azhotel/housekeeping/tasks/:id",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = azHousekeepingTaskUpdateSchema.parse(request.body);
      const task = await updateAzHousekeepingTask(propertyId, request.params.id, payload);
      if (!task) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Задача не найдена" });
      }

      return azHousekeepingTaskViewSchema.parse(task);
    }
  );
}
