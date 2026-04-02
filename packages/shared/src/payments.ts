import { z } from "zod";

export const paymentMethodSchema = z.enum(["cash", "card", "bank_transfer"]);
export const paymentStatusSchema = z.enum(["unpaid", "partially_paid", "paid"]);
export const folioChargeTypeSchema = z.enum(["room", "breakfast", "parking", "laundry", "minibar", "other"]);

export const paymentRecordSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  guestName: z.string(),
  amount: z.number(),
  method: paymentMethodSchema,
  receivedAt: z.string(),
  note: z.string()
});

export const folioChargeSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  guestName: z.string(),
  type: folioChargeTypeSchema,
  description: z.string(),
  amount: z.number().positive(),
  postedAt: z.string()
});

export const folioSummarySchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  balanceDue: z.number().nonnegative(),
  status: paymentStatusSchema
});

export const folioDetailsSchema = folioSummarySchema.extend({
  charges: z.array(folioChargeSchema),
  payments: z.array(paymentRecordSchema)
});

export const createPaymentSchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  amount: z.number().positive(),
  method: paymentMethodSchema,
  note: z.string().default(""),
  idempotencyKey: z.string().min(8)
});

export const createChargeSchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  type: folioChargeTypeSchema,
  description: z.string().min(2),
  amount: z.number().positive(),
  idempotencyKey: z.string().min(8)
});

export type PaymentRecord = z.infer<typeof paymentRecordSchema>;
export type FolioCharge = z.infer<typeof folioChargeSchema>;
export type FolioSummary = z.infer<typeof folioSummarySchema>;
export type FolioDetails = z.infer<typeof folioDetailsSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
export type CreateCharge = z.infer<typeof createChargeSchema>;
