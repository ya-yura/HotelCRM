import type { FastifyReply, FastifyRequest } from "fastify";
import type { HotelRole, AuthSession } from "@hotel-crm/shared/auth";
import { getSessionByToken } from "../services/authStore";

declare module "fastify" {
  interface FastifyRequest {
    authSession: AuthSession | null;
  }
}

export function resolveSessionToken(request: FastifyRequest) {
  const headerToken = request.headers["x-session-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return null;
}

export async function attachAuthSession(request: FastifyRequest) {
  const token = resolveSessionToken(request);
  request.authSession = token ? await getSessionByToken(token) : null;
}

export function requireRoles(roles: HotelRole[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authSession) {
      return reply.code(401).send({
        code: "AUTH_REQUIRED",
        message: "Login is required"
      });
    }

    if (!roles.includes(request.authSession.role)) {
      return reply.code(403).send({
        code: "FORBIDDEN",
        message: "Your role does not allow this action"
      });
    }
  };
}

export function requireAzAccess(roles: Array<"admin" | "staff">) {
  return async function accessGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authSession) {
      return reply.code(401).send({
        code: "AUTH_REQUIRED",
        message: "Login is required"
      });
    }

    if (!roles.includes(request.authSession.azAccessRole)) {
      return reply.code(403).send({
        code: "FORBIDDEN",
        message: "У этого аккаунта нет доступа к разделу"
      });
    }
  };
}

export function requireRecentAuth(maxAgeMinutes = 10) {
  return async function recentAuthGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authSession) {
      return reply.code(401).send({
        code: "AUTH_REQUIRED",
        message: "Login is required"
      });
    }

    const recentAuthAt = new Date(request.authSession.recentAuthAt).getTime();
    if (Number.isNaN(recentAuthAt)) {
      return reply.code(403).send({
        code: "RECENT_AUTH_REQUIRED",
        message: "Подтвердите действие повторным вводом пароля или PIN"
      });
    }

    const diffMs = Date.now() - recentAuthAt;
    if (diffMs > maxAgeMinutes * 60_000) {
      return reply.code(403).send({
        code: "RECENT_AUTH_REQUIRED",
        message: "Подтвердите действие повторным вводом пароля или PIN"
      });
    }
  };
}
