import { z } from "zod";

export const complianceKindSchema = z.enum(["mvd", "rosstat", "internal"]);
export const complianceProviderSchema = z.enum(["manual", "mock_mvd_gateway", "mock_rosstat_gateway"]);
export const complianceSubmissionStatusSchema = z.enum([
  "draft",
  "ready",
  "submitted",
  "failed",
  "corrected"
]);
export const complianceSeveritySchema = z.enum(["error", "warning"]);
export const complianceDocumentKindSchema = z.enum([
  "registration_card",
  "stay_confirmation",
  "invoice_summary",
  "housekeeping_print",
  "maintenance_print"
]);

export const complianceIssueSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: complianceSeveritySchema.default("error")
});

export const complianceReadinessSchema = z.object({
  entityType: z.enum(["guest", "reservation", "stay"]),
  entityId: z.string(),
  guestProfileComplete: z.boolean(),
  complianceReady: z.boolean(),
  missingFields: z.array(z.string()).default([]),
  issues: z.array(complianceIssueSchema).default([]),
  requiredDocuments: z.array(z.string()).default([]),
  suggestedActions: z.array(z.string()).default([]),
  submissionIds: z.array(z.string()).default([])
});

export const complianceDocumentSchema = z.object({
  kind: complianceDocumentKindSchema,
  title: z.string(),
  fileName: z.string(),
  mimeType: z.string().default("text/html"),
  content: z.string()
});

export const complianceDatasetSchema = z.object({
  kind: z.enum(["mvd", "rosstat", "accounting"]),
  generatedAt: z.string(),
  columns: z.array(z.string()).default([]),
  rows: z.array(z.record(z.string(), z.string())).default([])
});

export const compliancePrepareRequestSchema = z.object({
  reservationId: z.string(),
  kinds: z.array(complianceKindSchema).default(["mvd", "rosstat"])
});

export const complianceSubmissionSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  kind: complianceKindSchema,
  entityType: z.string(),
  entityId: z.string(),
  status: complianceSubmissionStatusSchema,
  payloadJson: z.string(),
  provider: complianceProviderSchema.default("manual"),
  createdAt: z.string(),
  submittedAt: z.string().nullable().default(null),
  errorMessage: z.string().default(""),
  lastAttemptAt: z.string().nullable().default(null),
  attemptCount: z.number().int().nonnegative().default(0)
});

export type ComplianceSubmission = z.infer<typeof complianceSubmissionSchema>;
export type ComplianceKind = z.infer<typeof complianceKindSchema>;
export type ComplianceProvider = z.infer<typeof complianceProviderSchema>;
export type ComplianceSubmissionStatus = z.infer<typeof complianceSubmissionStatusSchema>;
export type ComplianceSeverity = z.infer<typeof complianceSeveritySchema>;
export type ComplianceIssue = z.infer<typeof complianceIssueSchema>;
export type ComplianceReadiness = z.infer<typeof complianceReadinessSchema>;
export type ComplianceDocument = z.infer<typeof complianceDocumentSchema>;
export type ComplianceDocumentKind = z.infer<typeof complianceDocumentKindSchema>;
export type ComplianceDataset = z.infer<typeof complianceDatasetSchema>;
