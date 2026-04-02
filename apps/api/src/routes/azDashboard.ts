import type { FastifyInstance } from "fastify";
import { azTodayDashboardSchema } from "@hotel-crm/shared/features/azhotel_core";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { getAzTodayDashboard } from "../services/azDashboardStore";

export async function registerAzDashboardRoutes(app: FastifyInstance) {
  app.get(
    "/azhotel/dashboard/today",
    { preHandler: requireRoles(["owner", "frontdesk", "housekeeping"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const limitedScope = request.authSession?.azAccessRole === "staff";
      const assigneeFilter = limitedScope ? request.authSession?.userName : undefined;

      return azTodayDashboardSchema.parse(
        await getAzTodayDashboard(propertyId, {
          limitedScope,
          assigneeFilter
        })
      );
    }
  );
}
