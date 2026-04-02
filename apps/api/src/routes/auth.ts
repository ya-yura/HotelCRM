import type { FastifyInstance } from "fastify";
import {
  authLoginRequestSchema,
  authSessionSchema,
  authStaffCreateRequestSchema,
  authUserSummarySchema
} from "@hotel-crm/shared/auth";
import {
  propertyCreateRequestSchema,
  propertySummarySchema
} from "@hotel-crm/shared/properties";
import {
  createStaffUser,
  listAuthUsers,
  login,
  logoutSession,
  registerOwner
} from "../services/authStore";
import { resolveSessionToken } from "../lib/auth";
import { requireAzAccess, requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/users", { preHandler: requireAzAccess(["admin"]) }, async (request, reply) => {
    const propertyId = request.authSession?.propertyId;
    if (!propertyId) {
      return reply.code(401).send({
        code: "AUTH_REQUIRED",
        message: "Property session required"
      });
    }

    return authUserSummarySchema.array().parse(await listAuthUsers(propertyId));
  });

  app.post("/auth/staff", { preHandler: [requireRoles(["owner", "frontdesk", "housekeeping", "accountant"]), requireAzAccess(["admin"])] }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = authStaffCreateRequestSchema.parse(request.body);
    const created = await createStaffUser({
      propertyId,
      name: payload.name,
      role: payload.role,
      azAccessRole: payload.azAccessRole,
      pin: payload.pin
    });
    if (!created) {
      return reply.code(409).send({
        code: "PIN_ALREADY_USED",
        message: "This PIN is already used in the property"
      });
    }

    return reply.code(201).send(
      authUserSummarySchema.parse({
        id: created.id,
        name: created.name,
        role: created.role,
        azAccessRole: created.azAccessRole,
        propertyId: created.propertyId,
        pinHint: `PIN ends with ${created.pin?.slice(-2) ?? ""}`
      })
    );
  });

  app.post("/auth/register-owner", async (request, reply) => {
    const payload = propertyCreateRequestSchema.parse(request.body);
    const created = await registerOwner(payload);
    if (!created) {
      return reply.code(409).send({
        code: "EMAIL_ALREADY_USED",
        message: "Owner with this email already exists"
      });
    }

    return reply.code(201).send({
      property: propertySummarySchema.parse(created.property),
      session: authSessionSchema.parse(created.session)
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const payload = authLoginRequestSchema.parse(request.body);
    const session = await login(payload);
    if (!session) {
      return reply.code(401).send({
        code: "INVALID_CREDENTIALS",
        message: "Wrong credentials"
      });
    }

    return authSessionSchema.parse(session);
  });

  app.get("/auth/session", async (request, reply) => {
    if (!request.authSession) {
      return reply.code(401).send({
        code: "AUTH_REQUIRED",
        message: "Session not found"
      });
    }

    return authSessionSchema.parse(request.authSession);
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = resolveSessionToken(request);
    if (!token) {
      return reply.code(204).send();
    }

    await logoutSession(token);
    return reply.code(204).send();
  });
}
