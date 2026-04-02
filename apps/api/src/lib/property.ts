import type { FastifyReply, FastifyRequest } from "fastify";

export function requirePropertySession(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authSession?.propertyId) {
    reply.code(401).send({
      code: "AUTH_REQUIRED",
      message: "Property session is required"
    });
    return null;
  }

  return request.authSession.propertyId;
}
