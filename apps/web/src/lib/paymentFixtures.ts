import type { FolioSummary, PaymentRecord } from "@hotel-crm/shared/payments";

export const initialFolios: FolioSummary[] = [
  {
    reservationId: "resv_demo_1",
    guestName: "Anna Petrova",
    totalAmount: 12000,
    paidAmount: 7500,
    balanceDue: 4500,
    status: "partially_paid"
  },
  {
    reservationId: "resv_demo_2",
    guestName: "Sergey Ivanov",
    totalAmount: 9600,
    paidAmount: 0,
    balanceDue: 9600,
    status: "unpaid"
  }
];

export const initialPayments: PaymentRecord[] = [
  {
    id: "pay_demo_1",
    reservationId: "resv_demo_1",
    guestName: "Anna Petrova",
    amount: 7500,
    method: "card",
    receivedAt: "2026-03-25T09:00:00.000Z",
    note: "Deposit at arrival"
  }
];
