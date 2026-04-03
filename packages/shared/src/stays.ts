import { z } from "zod";

export const stayStatusSchema = z.enum(["active", "checked_out"]);
export const stayMigrationStatusSchema = z.enum(["not_required", "missing", "ready", "submitted", "failed"]);

export const stayRecordSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  guestId: z.string().default(""),
  roomId: z.string(),
  roomLabel: z.string(),
  guestName: z.string(),
  citizenship: z.string().default("RU"),
  purposeOfVisit: z.string().default("tourism"),
  documentNumberMasked: z.string().default(""),
  migrationRegistrationStatus: stayMigrationStatusSchema.default("not_required"),
  status: stayStatusSchema,
  checkedInAt: z.string(),
  checkedOutAt: z.string().nullable()
});

export type StayRecord = z.infer<typeof stayRecordSchema>;
export type StayMigrationStatus = z.infer<typeof stayMigrationStatusSchema>;
