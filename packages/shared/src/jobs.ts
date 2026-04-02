import { z } from "zod";

export const backgroundJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed"
]);

export const backgroundJobSchema = z.object({
  id: z.string(),
  propertyId: z.string().nullable().default(null),
  jobType: z.string(),
  payloadJson: z.string(),
  status: backgroundJobStatusSchema,
  runAt: z.string(),
  attempts: z.number().int().min(0).default(0),
  lastError: z.string().default("")
});

export type BackgroundJob = z.infer<typeof backgroundJobSchema>;
export type BackgroundJobStatus = z.infer<typeof backgroundJobStatusSchema>;
