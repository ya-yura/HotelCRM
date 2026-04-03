import type { FastifyInstance } from "fastify";
import {
  managementDashboardSummarySchema,
  managementFiltersSchema,
  managementReportSummarySchema
} from "@hotel-crm/shared/management";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  exportManagementReportCsv,
  getManagementDashboard,
  getManagementReport
} from "../services/managementStore";

export async function registerManagementRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/management/dashboard",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const filters = managementFiltersSchema.parse(request.query);
      return managementDashboardSummarySchema.parse(
        await getManagementDashboard(propertyId, filters)
      );
    }
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/management/reports",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const filters = managementFiltersSchema.parse(request.query);
      return managementReportSummarySchema.parse(await getManagementReport(propertyId, filters));
    }
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/management/reports/export.csv",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const filters = managementFiltersSchema.parse(request.query);
      const csv = await exportManagementReportCsv(propertyId, filters);
      reply.type("text/csv; charset=utf-8");
      return csv;
    }
  );
}
