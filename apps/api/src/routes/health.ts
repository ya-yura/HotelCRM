import type { FastifyInstance } from "fastify";
import { getActivePersistenceMode } from "../services/dataStore";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    timestamp: new Date().toISOString(),
    persistenceMode: getActivePersistenceMode()
  }));
}
