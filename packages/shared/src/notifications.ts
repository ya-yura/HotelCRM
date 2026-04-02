import { z } from "zod";

export const notificationChannelSchema = z.enum(["push", "sms", "email", "webhook"]);
export const notificationStatusSchema = z.enum([
  "queued",
  "sent",
  "failed",
  "cancelled"
]);

export const notificationDeliverySchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  channel: notificationChannelSchema,
  topic: z.string(),
  recipient: z.string(),
  status: notificationStatusSchema,
  payloadJson: z.string(),
  createdAt: z.string(),
  deliveredAt: z.string().nullable().default(null)
});

export type NotificationDelivery = z.infer<typeof notificationDeliverySchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
