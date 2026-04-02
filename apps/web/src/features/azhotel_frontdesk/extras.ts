import type { AzBookingService } from "@hotel-crm/shared/features/azhotel_core";

const presetExtras = [
  { name: "Завтрак", price: 450 },
  { name: "Трансфер", price: 1200 },
  { name: "Прачечная", price: 350 },
  { name: "Поздний выезд", price: 1000 }
];

export function listExtraPresets() {
  return presetExtras;
}

export function createExtra(name = "", price = 0): AzBookingService {
  return {
    id: `az_service_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name,
    quantity: 1,
    price,
    total: price
  };
}

export function normalizeExtras(services: AzBookingService[]) {
  return services.map((service) => ({
    ...service,
    total: service.quantity * service.price
  }));
}
