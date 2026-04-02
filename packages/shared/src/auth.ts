import { z } from "zod";

export const hotelRoleSchema = z.enum(["owner", "frontdesk", "housekeeping", "accountant"]);
export const azAccessRoleSchema = z.enum(["admin", "staff"]);

export const authUserSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: hotelRoleSchema,
  azAccessRole: azAccessRoleSchema,
  propertyId: z.string(),
  pinHint: z.string()
});

export const authLoginRequestSchema = z.object({
  identifier: z.string().min(2),
  secret: z.string().min(4)
});

export const authStaffCreateRequestSchema = z.object({
  name: z.string().min(2),
  role: hotelRoleSchema.exclude(["owner"]),
  azAccessRole: azAccessRoleSchema.default("staff"),
  pin: z.string().min(4).max(8)
});

export const authSessionSchema = z.object({
  token: z.string(),
  userId: z.string(),
  userName: z.string(),
  propertyId: z.string(),
  propertyName: z.string(),
  role: hotelRoleSchema,
  azAccessRole: azAccessRoleSchema,
  createdAt: z.string()
});

export type HotelRole = z.infer<typeof hotelRoleSchema>;
export type AzAccessRole = z.infer<typeof azAccessRoleSchema>;
export type AuthUserSummary = z.infer<typeof authUserSummarySchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
