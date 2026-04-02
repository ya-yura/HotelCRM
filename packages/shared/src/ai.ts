import { z } from "zod";

export const aiAssistantItemSchema = z.object({
  id: z.string(),
  type: z.enum(["daily_summary", "anomaly", "pricing_hint", "occupancy_hint", "admin_routine"]),
  title: z.string(),
  detail: z.string(),
  confidence: z.number().min(0).max(1),
  actionLabel: z.string()
});

export const occupancyRecommendationSchema = z.object({
  reservationId: z.string(),
  roomId: z.string(),
  roomLabel: z.string(),
  score: z.number().min(0).max(1),
  explanation: z.string()
});

export const aiSearchResultSchema = z.object({
  id: z.string(),
  entityType: z.enum(["reservation", "guest", "room"]),
  title: z.string(),
  subtitle: z.string(),
  reason: z.string()
});

export const aiSearchRequestSchema = z.object({
  query: z.string().min(2)
});

export const bookingParseRequestSchema = z.object({
  rawText: z.string().min(5)
});

export const bookingParseResultSchema = z.object({
  guestName: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  roomTypeHint: z.string(),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean()
});

export const messageDraftRequestSchema = z.object({
  guestName: z.string().min(2),
  intent: z.enum(["confirmation", "arrival", "payment_reminder"])
});

export const messageDraftResultSchema = z.object({
  message: z.string(),
  confidence: z.number().min(0).max(1)
});

export const occupancyRecommendationRequestSchema = z.object({
  reservationId: z.string()
});

export type AIAssistantItem = z.infer<typeof aiAssistantItemSchema>;
export type AISearchResult = z.infer<typeof aiSearchResultSchema>;
export type BookingParseResult = z.infer<typeof bookingParseResultSchema>;
export type OccupancyRecommendation = z.infer<typeof occupancyRecommendationSchema>;
