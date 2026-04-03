import { z } from "zod";

export const guestDocumentTypeSchema = z.enum([
  "passport_rf",
  "international_passport",
  "residence_permit",
  "other"
]);

export const guestGenderSchema = z.enum(["male", "female", "unspecified"]);

export const guestVisaSchema = z.object({
  number: z.string().default(""),
  validUntil: z.string().default(""),
  issueCountry: z.string().default("")
});

export const guestMigrationCardSchema = z.object({
  number: z.string().default(""),
  issuedAt: z.string().default(""),
  expiresAt: z.string().default("")
});

export const guestDocumentSchema = z.object({
  type: guestDocumentTypeSchema,
  series: z.string().default(""),
  number: z.string().default(""),
  issuedBy: z.string().default(""),
  issuedAt: z.string().default(""),
  issuerCode: z.string().default(""),
  birthPlace: z.string().default(""),
  registrationAddress: z.string().default(""),
  citizenship: z.string().default("RU")
});

export const guestProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  gender: guestGenderSchema.default("unspecified"),
  phone: z.string().default(""),
  email: z.string().default(""),
  birthDate: z.string().default(""),
  citizenship: z.string().default("RU"),
  residentialAddress: z.string().default(""),
  arrivalPurpose: z.string().default("tourism"),
  notes: z.string().default(""),
  preferences: z.array(z.string()).default([]),
  document: guestDocumentSchema.optional(),
  visa: guestVisaSchema.optional(),
  migrationCard: guestMigrationCardSchema.optional(),
  stayHistory: z.array(z.string()).default([]),
  mergedGuestIds: z.array(z.string()).default([]),
  mergedIntoGuestId: z.string().nullable().default(null)
});

export const guestUpsertSchema = guestProfileSchema
  .omit({
    id: true,
    stayHistory: true,
    mergedGuestIds: true,
    mergedIntoGuestId: true
  })
  .extend({
    preferences: z.array(z.string()).default([])
  });

export const guestDuplicateCandidateSchema = z.object({
  guest: guestProfileSchema,
  reasons: z.array(z.string()).min(1)
});

export const guestMergeRequestSchema = z.object({
  primaryGuestId: z.string(),
  duplicateGuestId: z.string()
});

export const guestMergeResultSchema = z.object({
  primaryGuest: guestProfileSchema,
  mergedGuestId: z.string(),
  updatedReservationIds: z.array(z.string())
});

export type GuestProfile = z.infer<typeof guestProfileSchema>;
export type GuestDocument = z.infer<typeof guestDocumentSchema>;
export type GuestDocumentType = z.infer<typeof guestDocumentTypeSchema>;
export type GuestGender = z.infer<typeof guestGenderSchema>;
export type GuestVisa = z.infer<typeof guestVisaSchema>;
export type GuestMigrationCard = z.infer<typeof guestMigrationCardSchema>;
export type GuestUpsert = z.infer<typeof guestUpsertSchema>;
export type GuestDuplicateCandidate = z.infer<typeof guestDuplicateCandidateSchema>;
export type GuestMergeRequest = z.infer<typeof guestMergeRequestSchema>;
export type GuestMergeResult = z.infer<typeof guestMergeResultSchema>;
