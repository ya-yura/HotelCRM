import { z } from "zod";

export const hotelRoleSchema = z.enum([
  "owner",
  "manager",
  "frontdesk",
  "housekeeping",
  "maintenance",
  "accountant"
]);
export const azAccessRoleSchema = z.enum(["admin", "staff"]);
export const authMethodSchema = z.enum(["password", "pin"]);

export const authUserSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: hotelRoleSchema,
  azAccessRole: azAccessRoleSchema,
  propertyId: z.string(),
  email: z.string().default(""),
  active: z.boolean().default(true),
  quickUnlockEnabled: z.boolean().default(true),
  pinHint: z.string()
});

export const authLoginRequestSchema = z.object({
  identifier: z.string().min(2),
  secret: z.string().min(4),
  deviceLabel: z.string().min(2).max(80).default("Personal device")
});

export const authStaffCreateRequestSchema = z.object({
  name: z.string().min(2),
  role: hotelRoleSchema.exclude(["owner"]),
  azAccessRole: azAccessRoleSchema.default("staff"),
  email: z.string().email().optional(),
  pin: z.string().min(4).max(8),
  quickUnlockEnabled: z.boolean().default(true)
});

export const authReauthRequestSchema = z.object({
  secret: z.string().min(4)
});

export const authSessionSchema = z.object({
  token: z.string(),
  userId: z.string(),
  userName: z.string(),
  propertyId: z.string(),
  propertyName: z.string(),
  role: hotelRoleSchema,
  azAccessRole: azAccessRoleSchema,
  authMethod: authMethodSchema,
  deviceLabel: z.string(),
  quickUnlockEnabled: z.boolean(),
  createdAt: z.string(),
  recentAuthAt: z.string()
});

export type HotelRole = z.infer<typeof hotelRoleSchema>;
export type AzAccessRole = z.infer<typeof azAccessRoleSchema>;
export type AuthMethod = z.infer<typeof authMethodSchema>;
export type AuthUserSummary = z.infer<typeof authUserSummarySchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
