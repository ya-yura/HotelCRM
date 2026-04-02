import { z } from "zod";

export const paymentMethodSchema = z.enum(["cash", "card", "bank_transfer", "sbp", "yookassa", "tbank"]);
export const paymentProviderSchema = z.enum(["manual", "sbp", "yookassa", "tbank"]);
export const fiscalProviderSchema = z.enum(["none", "atol", "shtrih_m"]);
export const fiscalReceiptStatusSchema = z.enum(["not_required", "pending", "sent", "acknowledged", "failed"]);
export const paymentRecordKindSchema = z.enum(["payment", "deposit", "refund", "void"]);
export const paymentLinkStatusSchema = z.enum(["draft", "sent", "paid", "expired", "cancelled"]);
export const paymentStatusSchema = z.enum(["unpaid", "partially_paid", "paid"]);
export const folioChargeTypeSchema = z.enum([
  "room",
  "service",
  "breakfast",
  "parking",
  "laundry",
  "minibar",
  "damage",
  "tax_fee",
  "discount",
  "correction",
  "other"
]);

export const fiscalizationInfoSchema = z.object({
  provider: fiscalProviderSchema.default("none"),
  status: fiscalReceiptStatusSchema.default("not_required"),
  receiptNumber: z.string().default(""),
  requestedAt: z.string().nullable().default(null),
  acknowledgedAt: z.string().nullable().default(null),
  errorMessage: z.string().default("")
});

export const paymentLinkSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  guestName: z.string(),
  amount: z.number().positive(),
  method: z.enum(["sbp", "yookassa", "tbank"]),
  provider: paymentProviderSchema,
  url: z.string(),
  status: paymentLinkStatusSchema,
  createdAt: z.string(),
  expiresAt: z.string().nullable().default(null),
  lastSentAt: z.string().nullable().default(null),
  note: z.string().default("")
});

export const paymentRecordSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  guestName: z.string(),
  amount: z.number().refine((value) => value !== 0, "Payment amount cannot be zero"),
  method: paymentMethodSchema,
  provider: paymentProviderSchema.default("manual"),
  kind: paymentRecordKindSchema.default("payment"),
  receivedAt: z.string(),
  note: z.string(),
  reason: z.string().default(""),
  correlationId: z.string().default(""),
  paymentLinkId: z.string().nullable().default(null),
  fiscalization: fiscalizationInfoSchema.default({
    provider: "none",
    status: "not_required",
    receiptNumber: "",
    requestedAt: null,
    acknowledgedAt: null,
    errorMessage: ""
  })
});

export const folioChargeSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  guestName: z.string(),
  type: folioChargeTypeSchema,
  description: z.string(),
  amount: z.number().refine((value) => value !== 0, "Charge amount cannot be zero"),
  postedAt: z.string(),
  reason: z.string().default(""),
  correlationId: z.string().default("")
});

export const folioLineSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  createdAt: z.string(),
  kind: z.enum(["charge", "payment", "refund"]),
  title: z.string(),
  description: z.string(),
  amount: z.number().refine((value) => value !== 0, "Line amount cannot be zero"),
  sourceId: z.string(),
  sourceType: z.enum(["charge", "payment", "payment_link"]),
  paymentMethod: paymentMethodSchema.nullable().default(null),
  fiscalStatus: fiscalReceiptStatusSchema.default("not_required")
});

export const folioSummarySchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  balanceDue: z.number().nonnegative(),
  status: paymentStatusSchema,
  pendingFiscalReceipts: z.number().int().min(0).default(0)
});

export const folioDetailsSchema = folioSummarySchema.extend({
  charges: z.array(folioChargeSchema),
  payments: z.array(paymentRecordSchema),
  lines: z.array(folioLineSchema).default([]),
  paymentLinks: z.array(paymentLinkSchema).default([])
});

export const createPaymentSchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  amount: z.number().positive(),
  method: paymentMethodSchema,
  provider: paymentProviderSchema.default("manual"),
  kind: paymentRecordKindSchema.default("payment"),
  note: z.string().default(""),
  reason: z.string().default(""),
  correlationId: z.string().default(""),
  paymentLinkId: z.string().nullable().default(null),
  idempotencyKey: z.string().min(8)
});

export const createChargeSchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  type: folioChargeTypeSchema,
  description: z.string().min(2),
  amount: z.number().positive(),
  reason: z.string().default(""),
  correlationId: z.string().default(""),
  idempotencyKey: z.string().min(8)
});

export const paymentRefundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(2),
  correlationId: z.string().default("")
});

export const folioCorrectionSchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  amount: z.number().positive(),
  direction: z.enum(["increase_balance", "decrease_balance"]),
  description: z.string().min(2),
  reason: z.string().min(2),
  correlationId: z.string().default(""),
  idempotencyKey: z.string().min(8)
});

export const createPaymentLinkSchema = z.object({
  reservationId: z.string(),
  guestName: z.string(),
  amount: z.number().positive(),
  method: z.enum(["sbp", "yookassa", "tbank"]),
  note: z.string().default(""),
  correlationId: z.string().default("")
});

export type PaymentRecord = z.infer<typeof paymentRecordSchema>;
export type FolioCharge = z.infer<typeof folioChargeSchema>;
export type FolioLine = z.infer<typeof folioLineSchema>;
export type FolioSummary = z.infer<typeof folioSummarySchema>;
export type FolioDetails = z.infer<typeof folioDetailsSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
export type CreateCharge = z.infer<typeof createChargeSchema>;
export type PaymentLink = z.infer<typeof paymentLinkSchema>;
export type FiscalizationInfo = z.infer<typeof fiscalizationInfoSchema>;
export type PaymentRefund = z.infer<typeof paymentRefundSchema>;
export type FolioCorrection = z.infer<typeof folioCorrectionSchema>;
export type CreatePaymentLink = z.infer<typeof createPaymentLinkSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type FiscalProvider = z.infer<typeof fiscalProviderSchema>;
export type FiscalReceiptStatus = z.infer<typeof fiscalReceiptStatusSchema>;
