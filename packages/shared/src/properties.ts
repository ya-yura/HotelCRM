import { z } from "zod";

export const propertyTypeSchema = z.enum(["small_hotel", "hostel", "guest_house", "glamping"]);
export const propertyVatRateSchema = z.enum(["none", "0", "10", "20"]);

export const propertyLegalInfoSchema = z.object({
  legalEntityName: z.string().default(""),
  taxId: z.string().default(""),
  registrationNumber: z.string().default(""),
  vatRate: propertyVatRateSchema.default("none")
});

export const propertyNotificationSettingsSchema = z.object({
  newReservationPush: z.boolean().default(true),
  arrivalReminderPush: z.boolean().default(true),
  housekeepingAlerts: z.boolean().default(true),
  financeAlerts: z.boolean().default(true)
});

export const propertyOperationSettingsSchema = z.object({
  defaultCheckInTime: z.string().default("14:00"),
  defaultCheckOutTime: z.string().default("12:00"),
  housekeepingStartTime: z.string().default("09:00"),
  housekeepingEndTime: z.string().default("18:00"),
  sharedDeviceMode: z.boolean().default(true)
});

export const propertySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string().default(""),
  timezone: z.string(),
  currency: z.string(),
  address: z.string(),
  active: z.boolean(),
  propertyType: propertyTypeSchema.default("small_hotel"),
  legalInfo: propertyLegalInfoSchema.default({}),
  notificationSettings: propertyNotificationSettingsSchema.default({}),
  operationSettings: propertyOperationSettingsSchema.default({})
});

export const propertyCreateRequestSchema = z.object({
  ownerName: z.string().min(2, "Имя владельца должно быть не короче 2 символов"),
  hotelName: z.string().min(2, "Название отеля должно быть не короче 2 символов"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен быть не короче 6 символов"),
  city: z.string().min(2, "Укажите город"),
  timezone: z.string().min(2, "Укажите часовой пояс"),
  currency: z.string().min(3, "Укажите валюту"),
  address: z.string().min(3, "Адрес должен быть не короче 3 символов"),
  propertyType: propertyTypeSchema.default("small_hotel")
});

export const propertyUpdateRequestSchema = propertySummarySchema
  .omit({ id: true })
  .partial();

export type PropertySummary = z.infer<typeof propertySummarySchema>;
export type PropertyUpdateRequest = z.infer<typeof propertyUpdateRequestSchema>;
export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type PropertyVatRate = z.infer<typeof propertyVatRateSchema>;
