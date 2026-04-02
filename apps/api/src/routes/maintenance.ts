import type { FastifyInstance } from "fastify";
import {
  maintenanceCreateSchema,
  maintenanceIncidentSchema,
  maintenanceUpdateSchema
} from "@hotel-crm/shared/maintenance";
import { requireRoles } from "../lib/auth";
import { requirePropertySession } from "../lib/property";
import {
  createMaintenanceIncident,
  getMaintenanceIncident,
  listMaintenanceIncidents,
  updateMaintenanceIncident
} from "../services/maintenanceStore";

export async function registerMaintenanceRoutes(app: FastifyInstance) {
  app.get("/maintenance/incidents", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    return maintenanceIncidentSchema.array().parse(await listMaintenanceIncidents(propertyId));
  });

  app.get<{ Params: { id: string } }>("/maintenance/incidents/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const incident = await getMaintenanceIncident(propertyId, request.params.id);
    if (!incident) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Maintenance incident not found" });
    }

    return maintenanceIncidentSchema.parse(incident);
  });

  app.post("/maintenance/incidents", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = maintenanceCreateSchema.parse(request.body);
    const incident = await createMaintenanceIncident(propertyId, payload);
    return reply.code(201).send(maintenanceIncidentSchema.parse(incident));
  });

  app.patch<{ Params: { id: string } }>("/maintenance/incidents/:id", { preHandler: requireRoles(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = maintenanceUpdateSchema.parse(request.body);
    const incident = await updateMaintenanceIncident(propertyId, request.params.id, payload);
    if (!incident) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Maintenance incident not found" });
    }

    return maintenanceIncidentSchema.parse(incident);
  });

  app.post<{ Params: { id: string } }>("/maintenance/incidents/:id/resolve", { preHandler: requireRoles(["owner", "manager", "maintenance"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }

    const payload = maintenanceUpdateSchema.parse(request.body ?? {});
    const incident = await updateMaintenanceIncident(propertyId, request.params.id, {
      ...payload,
      status: "resolved"
    });
    if (!incident) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Maintenance incident not found" });
    }

    return maintenanceIncidentSchema.parse(incident);
  });
}
