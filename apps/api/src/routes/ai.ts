import type { FastifyInstance } from "fastify";
import {
  aiAssistantItemSchema,
  occupancyRecommendationRequestSchema,
  occupancyRecommendationSchema,
  aiSearchRequestSchema,
  aiSearchResultSchema,
  bookingParseRequestSchema,
  bookingParseResultSchema,
  messageDraftRequestSchema,
  messageDraftResultSchema
} from "@hotel-crm/shared/ai";
import { requireRoles } from "../lib/auth";
import {
  draftGuestMessage,
  getOccupancyRecommendations,
  listAssistantItems,
  parseBookingText,
  searchWithAI
} from "../services/aiStore";
import { requirePropertySession } from "../lib/property";

export async function registerAIRoutes(app: FastifyInstance) {
  app.post("/ai/daily-summary", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    return aiAssistantItemSchema.array().parse(await listAssistantItems(propertyId));
  });

  app.post("/ai/search", { preHandler: requireRoles(["owner", "frontdesk", "housekeeping", "accountant"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = aiSearchRequestSchema.parse(request.body);
    return aiSearchResultSchema.array().parse(await searchWithAI(propertyId, payload.query));
  });

  app.post("/ai/occupancy-hints", { preHandler: requireRoles(["owner", "frontdesk"]) }, async (request, reply) => {
    const propertyId = requirePropertySession(request, reply);
    if (!propertyId) {
      return;
    }
    const payload = occupancyRecommendationRequestSchema.parse(request.body);
    return occupancyRecommendationSchema
      .array()
      .parse(await getOccupancyRecommendations(propertyId, payload.reservationId));
  });

  app.post("/ai/parse-booking", { preHandler: requireRoles(["owner", "frontdesk"]) }, async (request) => {
    const payload = bookingParseRequestSchema.parse(request.body);
    return bookingParseResultSchema.parse(parseBookingText(payload.rawText));
  });

  app.post("/ai/message-draft", { preHandler: requireRoles(["owner", "frontdesk", "accountant"]) }, async (request) => {
    const payload = messageDraftRequestSchema.parse(request.body);
    return messageDraftResultSchema.parse(draftGuestMessage(payload.guestName, payload.intent));
  });
}
