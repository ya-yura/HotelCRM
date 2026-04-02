import { z } from "zod";

export const propertySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  currency: z.string(),
  address: z.string(),
  active: z.boolean()
});

export const propertyCreateRequestSchema = z.object({
  ownerName: z.string().min(2, "Имя владельца должно быть не короче 2 символов"),
  hotelName: z.string().min(2, "Название отеля должно быть не короче 2 символов"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен быть не короче 6 символов"),
  timezone: z.string().min(2, "Укажите часовой пояс"),
  currency: z.string().min(3, "Укажите валюту"),
  address: z.string().min(3, "Адрес должен быть не короче 3 символов")
});

export type PropertySummary = z.infer<typeof propertySummarySchema>;
