import { z } from "zod";

export const complianceKindSchema = z.enum(["mvd", "rosstat", "internal"]);
export const complianceSubmissionStatusSchema = z.enum([
  "draft",
  "ready",
  "submitted",
  "failed",
  "corrected"
]);

export const complianceSubmissionSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  kind: complianceKindSchema,
  entityType: z.string(),
  entityId: z.string(),
  status: complianceSubmissionStatusSchema,
  payloadJson: z.string(),
  provider: z.string().default(""),
  createdAt: z.string(),
  submittedAt: z.string().nullable().default(null),
  errorMessage: z.string().default("")
});

export type ComplianceSubmission = z.infer<typeof complianceSubmissionSchema>;
export type ComplianceKind = z.infer<typeof complianceKindSchema>;
export type ComplianceSubmissionStatus = z.infer<typeof complianceSubmissionStatusSchema>;
