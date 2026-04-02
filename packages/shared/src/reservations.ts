import { z } from "zod";
import { paymentMethodSchema } from "./payments";

export const reservationStatusSchema = z.enum([
  "inquiry",
  "draft",
  "pending_confirmation",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show"
]);

export const reservationSourceSchema = z.enum([
  "phone",
  "walk_in",
  "whatsapp",
  "ota",
  "manual"
]);

export const reservationCreateSchema = z.object({
  guestName: z.string().min(2),
  guestPhone: z.string().optional(),
  guestEmail: z.string().optional(),
  guestBirthDate: z.string().optional(),
  checkInDate: z.string().min(10),
  checkOutDate: z.string().min(10),
  adultCount: z.number().int().positive(),
  childCount: z.number().int().min(0).default(0),
  roomTypeId: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  depositRequired: z.number().nonnegative().optional(),
  depositAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  source: reservationSourceSchema,
  idempotencyKey: z.string().min(8)
});

export const reservationSummarySchema = z.object({
  id: z.string(),
  guestId: z.string().optional(),
  guestName: z.string(),
  guestPhone: z.string().optional(),
  guestEmail: z.string().optional(),
  roomLabel: z.string(),
  roomTypeId: z.string().optional(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  status: reservationStatusSchema,
  source: reservationSourceSchema.optional(),
  adultCount: z.number().int().positive().optional(),
  childCount: z.number().int().min(0).optional(),
  totalAmount: z.number().nonnegative().optional(),
  paidAmount: z.number().nonnegative().optional(),
  balanceDue: z.number(),
  depositRequired: z.number().nonnegative().optional(),
  depositAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  earlyCheckInGranted: z.boolean().optional(),
  lateCheckoutGranted: z.boolean().optional(),
  splitFromReservationId: z.string().nullable().optional(),
  mergedReservationIds: z.array(z.string()).optional(),
  paymentLinkSentAt: z.string().nullable().optional()
});

export const reservationUpdateSchema = reservationSummarySchema
  .omit({
    id: true,
    balanceDue: true
  })
  .partial()
  .extend({
    balanceDue: z.number().nonnegative().optional()
  });

export const reservationCheckInRequestSchema = z.object({
  depositAmount: z.number().nonnegative().optional(),
  paymentMethod: paymentMethodSchema.optional()
}).partial();

export const reservationPaymentLinkRequestSchema = z.object({
  channel: z.enum(["sms", "whatsapp", "email"]).default("whatsapp"),
  method: z.enum(["sbp", "yookassa", "tbank"]).default("sbp"),
  amount: z.number().positive().optional()
});

export type ReservationCreate = z.infer<typeof reservationCreateSchema>;
export type ReservationSummary = z.infer<typeof reservationSummarySchema>;
export type ReservationSource = z.infer<typeof reservationSourceSchema>;
export type ReservationUpdate = z.infer<typeof reservationUpdateSchema>;
