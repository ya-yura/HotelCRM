import { z } from "zod";

export const reservationStatusSchema = z.enum([
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
  checkInDate: z.string().min(10),
  checkOutDate: z.string().min(10),
  adultCount: z.number().int().positive(),
  childCount: z.number().int().min(0).default(0),
  roomTypeId: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  source: reservationSourceSchema,
  idempotencyKey: z.string().min(8)
});

export const reservationSummarySchema = z.object({
  id: z.string(),
  guestName: z.string(),
  roomLabel: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  status: reservationStatusSchema,
  balanceDue: z.number()
});

export type ReservationCreate = z.infer<typeof reservationCreateSchema>;
export type ReservationSummary = z.infer<typeof reservationSummarySchema>;
export type ReservationSource = z.infer<typeof reservationSourceSchema>;
