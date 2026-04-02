import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { attachAuthSession } from "./lib/auth";
import { registerAIRoutes } from "./routes/ai";
import { registerAzBookingRoutes } from "./routes/azBookings";
import { registerAzChannelManagerRoutes } from "./routes/azChannelManager";
import { registerAzDashboardRoutes } from "./routes/azDashboard";
import { registerAzFrontdeskRoutes } from "./routes/azFrontdesk";
import { registerAzHousekeepingRoutes } from "./routes/azHousekeeping";
import { registerAzRoomRoutes } from "./routes/azRooms";
import { registerAzReportRoutes } from "./routes/azReports";
import { registerAuthRoutes } from "./routes/auth";
import { registerAuditRoutes } from "./routes/audit";
import { registerHealthRoutes } from "./routes/health";
import { registerGuestRoutes } from "./routes/guests";
import { registerHousekeepingRoutes } from "./routes/housekeeping";
import { registerMaintenanceRoutes } from "./routes/maintenance";
import { registerPaymentRoutes } from "./routes/payments";
import { registerPublicBookingEngineRoutes } from "./routes/publicBookingEngine";
import { registerPropertyRoutes } from "./routes/properties";
import { registerReservationRoutes } from "./routes/reservations";
import { registerRoomRoutes } from "./routes/rooms";
import { registerStayRoutes } from "./routes/stays";
import { registerSyncRoutes } from "./routes/sync";

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  void app.register(cors, {
    origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-session-token"]
  });

  app.addHook("preHandler", attachAuthSession);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        code: "VALIDATION_ERROR",
        message: error.issues.map((issue) => issue.message).join(" "),
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    return reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Внутренняя ошибка сервера"
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "hotel-crm-api"
  }));

  app.register(registerAIRoutes, { prefix: "/api" });
  app.register(registerAzBookingRoutes, { prefix: "/api" });
  app.register(registerAzChannelManagerRoutes, { prefix: "/api" });
  app.register(registerAzDashboardRoutes, { prefix: "/api" });
  app.register(registerAzFrontdeskRoutes, { prefix: "/api" });
  app.register(registerAzHousekeepingRoutes, { prefix: "/api" });
  app.register(registerAzReportRoutes, { prefix: "/api" });
  app.register(registerAzRoomRoutes, { prefix: "/api" });
  app.register(registerAuthRoutes, { prefix: "/api" });
  app.register(registerAuditRoutes, { prefix: "/api" });
  app.register(registerHealthRoutes, { prefix: "/api" });
  app.register(registerGuestRoutes, { prefix: "/api" });
  app.register(registerHousekeepingRoutes, { prefix: "/api" });
  app.register(registerMaintenanceRoutes, { prefix: "/api" });
  app.register(registerPaymentRoutes, { prefix: "/api" });
  app.register(registerPublicBookingEngineRoutes, { prefix: "/api" });
  app.register(registerPropertyRoutes, { prefix: "/api" });
  app.register(registerReservationRoutes, { prefix: "/api" });
  app.register(registerRoomRoutes, { prefix: "/api" });
  app.register(registerStayRoutes, { prefix: "/api" });
  app.register(registerSyncRoutes, { prefix: "/api" });

  return app;
}
