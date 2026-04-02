import { z } from "zod";

export const roomStatusSchema = z.enum([
  "available",
  "reserved",
  "occupied",
  "dirty",
  "cleaning",
  "inspected",
  "blocked_maintenance",
  "out_of_service"
]);

export const roomPrioritySchema = z.enum(["normal", "arrival_soon", "blocked"]);

export const roomSummarySchema = z.object({
  id: z.string(),
  number: z.string(),
  roomType: z.string(),
  status: roomStatusSchema,
  housekeepingNote: z.string(),
  nextAction: z.string(),
  occupancyLabel: z.string(),
  priority: roomPrioritySchema
});

export const roomStatusUpdateSchema = z.object({
  status: roomStatusSchema
});

export const roomCreateSchema = z.object({
  number: z.string().min(1),
  roomType: z.string().min(2),
  priority: roomPrioritySchema.default("normal")
});

export type RoomStatus = z.infer<typeof roomStatusSchema>;
export type RoomSummary = z.infer<typeof roomSummarySchema>;
export type RoomStatusUpdate = z.infer<typeof roomStatusUpdateSchema>;
export type RoomCreate = z.infer<typeof roomCreateSchema>;
