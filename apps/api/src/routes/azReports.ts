import type { FastifyInstance } from "fastify";
import { azReportSummarySchema } from "@hotel-crm/shared/features/azhotel_core";
import { requireAzAccess, requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { buildAzReportCsv, getAzReportSummary } from "../services/azReportsStore";

function defaultPeriod() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10)
  };
}

export async function registerAzReportRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/azhotel/reports",
    { preHandler: [requireRoles(["owner", "frontdesk", "accountant"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const period = {
        from: request.query.from ?? defaultPeriod().from,
        to: request.query.to ?? defaultPeriod().to
      };

      return azReportSummarySchema.parse(await getAzReportSummary(propertyId, period.from, period.to));
    }
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/azhotel/reports/export.csv",
    { preHandler: [requireRoles(["owner", "frontdesk", "accountant"]), requireAzAccess(["admin"])] },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const period = {
        from: request.query.from ?? defaultPeriod().from,
        to: request.query.to ?? defaultPeriod().to
      };
      const report = await getAzReportSummary(propertyId, period.from, period.to);
      const csv = buildAzReportCsv(report);

      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="azhotel-report-${period.from}-${period.to}.csv"`);
      return `\uFEFF${csv}`;
    }
  );
}
