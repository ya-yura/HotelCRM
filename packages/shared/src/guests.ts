import { z } from "zod";

export const guestDocumentTypeSchema = z.enum([
  "passport_rf",
  "international_passport",
  "residence_permit",
  "other"
]);

export const guestDocumentSchema = z.object({
  type: guestDocumentTypeSchema,
  series: z.string().default(""),
  number: z.string().default(""),
  issuedBy: z.string().default(""),
  issuedAt: z.string().default(""),
  citizenship: z.string().default("RU")
});

export const guestProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string().default(""),
  email: z.string().default(""),
  birthDate: z.string().default(""),
  notes: z.string().default(""),
  preferences: z.array(z.string()).default([]),
  document: guestDocumentSchema.optional(),
  stayHistory: z.array(z.string()).default([]),
  mergedIntoGuestId: z.string().nullable().default(null)
});

export type GuestProfile = z.infer<typeof guestProfileSchema>;
export type GuestDocument = z.infer<typeof guestDocumentSchema>;
export type GuestDocumentType = z.infer<typeof guestDocumentTypeSchema>;
