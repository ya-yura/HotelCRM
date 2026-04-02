import { z } from "zod";

export const stayStatusSchema = z.enum(["active", "checked_out"]);

export const stayRecordSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  roomId: z.string(),
  roomLabel: z.string(),
  guestName: z.string(),
  status: stayStatusSchema,
  checkedInAt: z.string(),
  checkedOutAt: z.string().nullable()
});

export type StayRecord = z.infer<typeof stayRecordSchema>;
