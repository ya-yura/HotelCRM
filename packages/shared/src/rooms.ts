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

export const roomReadinessSchema = z.enum([
  "clean",
  "dirty",
  "inspected",
  "occupied",
  "maintenance_required",
  "blocked"
]);

export const roomPrioritySchema = z.enum(["normal", "arrival_soon", "blocked"]);
export const roomUnitKindSchema = z.enum(["room", "bed", "glamp_unit"]);

export const glampingMetadataSchema = z.object({
  unitType: z.string().default(""),
  outdoorAreaLabel: z.string().default(""),
  heatingMode: z.string().default(""),
  accessNotes: z.string().default("")
});

export const roomSummarySchema = z.object({
  id: z.string(),
  number: z.string(),
  roomType: z.string(),
  unitKind: roomUnitKindSchema.default("room"),
  status: roomStatusSchema,
  readiness: roomReadinessSchema.default("clean"),
  readinessLabel: z.string().default("Готов"),
  housekeepingNote: z.string(),
  nextAction: z.string(),
  occupancyLabel: z.string(),
  priority: roomPrioritySchema,
  floor: z.string().default(""),
  zone: z.string().default(""),
  occupancyLimit: z.number().int().positive().default(2),
  amenities: z.array(z.string()).default([]),
  minibarEnabled: z.boolean().default(false),
  lastCleanedAt: z.string().nullable().default(null),
  nextArrivalLabel: z.string().default(""),
  outOfOrderReason: z.string().default(""),
  activeMaintenanceIncidentId: z.string().nullable().default(null),
  glampingMetadata: glampingMetadataSchema.nullable().default(null)
});

export const roomStatusUpdateSchema = z.object({
  status: roomStatusSchema,
  housekeepingNote: z.string().optional(),
  nextAction: z.string().optional()
});

export const roomCreateSchema = z.object({
  number: z.string().min(1),
  roomType: z.string().min(2),
  priority: roomPrioritySchema.default("normal"),
  unitKind: roomUnitKindSchema.default("room"),
  floor: z.string().default(""),
  zone: z.string().default(""),
  occupancyLimit: z.number().int().positive().default(2),
  amenities: z.array(z.string()).default([]),
  minibarEnabled: z.boolean().default(false),
  nextArrivalLabel: z.string().default(""),
  glampingMetadata: glampingMetadataSchema.nullable().default(null)
});

export type RoomStatus = z.infer<typeof roomStatusSchema>;
export type RoomReadiness = z.infer<typeof roomReadinessSchema>;
export type RoomSummary = z.infer<typeof roomSummarySchema>;
export type RoomStatusUpdate = z.infer<typeof roomStatusUpdateSchema>;
export type RoomCreate = z.infer<typeof roomCreateSchema>;
export type RoomUnitKind = z.infer<typeof roomUnitKindSchema>;
