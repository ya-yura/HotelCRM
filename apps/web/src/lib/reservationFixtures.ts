import type { ReservationSummary } from "@hotel-crm/shared/reservations";

export const initialReservations: ReservationSummary[] = [
  {
    id: "resv_demo_1",
    guestName: "Anna Petrova",
    roomLabel: "203",
    checkInDate: "2026-03-25",
    checkOutDate: "2026-03-28",
    status: "confirmed",
    balanceDue: 4500
  },
  {
    id: "resv_demo_2",
    guestName: "Sergey Ivanov",
    roomLabel: "family",
    checkInDate: "2026-03-26",
    checkOutDate: "2026-03-29",
    status: "pending_confirmation",
    balanceDue: 9600
  }
];
