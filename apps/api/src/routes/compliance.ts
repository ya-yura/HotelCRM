import type { FastifyInstance } from "fastify";
import {
  complianceDatasetSchema,
  complianceDocumentSchema,
  compliancePrepareRequestSchema,
  complianceReadinessSchema,
  complianceSubmissionSchema
} from "@hotel-crm/shared/compliance";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import { appendAuditLog } from "../services/auditStore";
import {
  generateComplianceDatasets,
  generateComplianceDocuments,
  getReservationComplianceReadiness,
  listComplianceSubmissions,
  prepareComplianceSubmissions,
  submitComplianceSubmission
} from "../services/complianceStore";

export async function registerComplianceRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { reservationId?: string } }>(
    "/compliance/submissions",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      return complianceSubmissionSchema
        .array()
        .parse(await listComplianceSubmissions(propertyId, request.query.reservationId));
    }
  );

  app.get<{ Params: { reservationId: string } }>(
    "/compliance/reservations/:reservationId/readiness",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const readiness = await getReservationComplianceReadiness(
        propertyId,
        request.params.reservationId
      );
      if (!readiness) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      return complianceReadinessSchema.parse(readiness);
    }
  );

  app.post(
    "/compliance/prepare",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const payload = compliancePrepareRequestSchema.parse(request.body);
      const prepared = await prepareComplianceSubmissions(
        propertyId,
        payload.reservationId,
        payload.kinds
      );
      if (!prepared) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      await appendAuditLog(propertyId, {
        entityType: "reservation",
        entityId: payload.reservationId,
        action: "compliance_prepared",
        reason: `Prepared compliance pack: ${payload.kinds.join(", ")}`
      });

      return complianceSubmissionSchema.array().parse(prepared);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/compliance/submissions/:id/submit",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const submitted = await submitComplianceSubmission(propertyId, request.params.id);
      if (!submitted) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Submission not found" });
      }
      if (submitted.status === "failed" && submitted.errorMessage.includes("draft")) {
        return reply.code(409).send({
          code: "COMPLIANCE_NOT_READY",
          message: submitted.errorMessage
        });
      }

      await appendAuditLog(propertyId, {
        entityType: "reservation",
        entityId: submitted.entityId,
        action: submitted.status === "submitted" ? "compliance_submitted" : "compliance_failed",
        reason:
          submitted.status === "submitted"
            ? `Submission ${submitted.kind} sent via ${submitted.provider}`
            : submitted.errorMessage || `Submission ${submitted.kind} failed`
      });

      return complianceSubmissionSchema.parse(submitted);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/compliance/submissions/:id/retry",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const retried = await submitComplianceSubmission(propertyId, request.params.id);
      if (!retried) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Submission not found" });
      }

      await appendAuditLog(propertyId, {
        entityType: "reservation",
        entityId: retried.entityId,
        action: retried.status === "submitted" ? "compliance_retry_succeeded" : "compliance_retry_failed",
        reason:
          retried.status === "submitted"
            ? `Retry succeeded for ${retried.kind}`
            : retried.errorMessage || `Retry failed for ${retried.kind}`
      });

      return complianceSubmissionSchema.parse(retried);
    }
  );

  app.get<{ Params: { reservationId: string } }>(
    "/compliance/reservations/:reservationId/documents",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const documents = await generateComplianceDocuments(propertyId, request.params.reservationId);
      if (!documents) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      return complianceDocumentSchema.array().parse(documents);
    }
  );

  app.get<{ Params: { reservationId: string } }>(
    "/compliance/reservations/:reservationId/datasets",
    { preHandler: requireRoles(["owner", "manager", "frontdesk", "accountant"]) },
    async (request, reply) => {
      const propertyId = requirePropertySession(request, reply);
      if (!propertyId) {
        return;
      }

      const datasets = await generateComplianceDatasets(propertyId, request.params.reservationId);
      if (!datasets) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      return complianceDatasetSchema.array().parse(datasets);
    }
  );
}
