import type {
  CreateCharge,
  CreatePayment,
  FolioCharge,
  FolioDetails,
  FolioSummary,
  PaymentRecord
} from "@hotel-crm/shared/payments";
import { getHotelData, updateHotelData } from "./dataStore";

function deriveStatus(totalAmount: number, paidAmount: number): FolioSummary["status"] {
  if (paidAmount <= 0) {
    return "unpaid";
  }
  if (paidAmount >= totalAmount) {
    return "paid";
  }
  return "partially_paid";
}

function toFolioSummary(folio: FolioDetails): FolioSummary {
  return {
    reservationId: folio.reservationId,
    guestName: folio.guestName,
    totalAmount: folio.totalAmount,
    paidAmount: folio.paidAmount,
    balanceDue: folio.balanceDue,
    status: folio.status
  };
}

function buildDefaultFolio(propertyId: string, reservationId: string, guestName: string) {
  return {
    propertyId,
    reservationId,
    guestName,
    totalAmount: 0,
    paidAmount: 0,
    balanceDue: 0,
    status: "unpaid" as const,
    charges: [] as FolioCharge[],
    payments: [] as PaymentRecord[]
  };
}

function syncReservationBalance(data: Awaited<ReturnType<typeof getHotelData>>, propertyId: string, reservationId: string, balanceDue: number) {
  const reservationIndex = data.reservations.findIndex(
    (reservation) => reservation.propertyId === propertyId && reservation.id === reservationId
  );
  if (reservationIndex >= 0) {
    data.reservations[reservationIndex] = {
      ...data.reservations[reservationIndex],
      balanceDue
    };
  }
}

export async function listFolios(propertyId: string) {
  return (await getHotelData()).folios
    .filter((folio) => folio.propertyId === propertyId)
    .map(toFolioSummary);
}

export async function listFolioDetails(propertyId: string) {
  return (await getHotelData()).folios.filter((folio) => folio.propertyId === propertyId);
}

export async function getFolio(propertyId: string, reservationId: string) {
  const folio = (await getHotelData()).folios.find(
    (entry) => entry.propertyId === propertyId && entry.reservationId === reservationId
  );
  return folio ? toFolioSummary(folio) : null;
}

export async function getFolioDetails(propertyId: string, reservationId: string) {
  return (
    (await getHotelData()).folios.find(
      (entry) => entry.propertyId === propertyId && entry.reservationId === reservationId
    ) ?? null
  );
}

export async function listPayments(propertyId: string) {
  return (await getHotelData()).payments
    .filter((payment) => payment.propertyId === propertyId)
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
}

export async function getPayment(propertyId: string, id: string) {
  return (await getHotelData()).payments.find((payment) => payment.propertyId === propertyId && payment.id === id) ?? null;
}

export async function createCharge(propertyId: string, input: CreateCharge) {
  return updateHotelData(async (data) => {
    const folioIndex = data.folios.findIndex(
      (folio) => folio.propertyId === propertyId && folio.reservationId === input.reservationId
    );
    const existingFolio = folioIndex >= 0
      ? data.folios[folioIndex]
      : buildDefaultFolio(propertyId, input.reservationId, input.guestName);

    const existingCharge = existingFolio.charges.find(
      (charge) => charge.id === `charge_${input.idempotencyKey}`
    );
    if (existingCharge) {
      return {
        charge: existingCharge,
        folio: existingFolio
      };
    }

    const charge: FolioCharge = {
      id: `charge_${input.idempotencyKey}`,
      reservationId: input.reservationId,
      guestName: input.guestName,
      type: input.type,
      description: input.description,
      amount: input.amount,
      postedAt: new Date().toISOString()
    };

    const totalAmount = existingFolio.totalAmount + input.amount;
    const updatedFolio = {
      ...existingFolio,
      guestName: input.guestName,
      totalAmount,
      balanceDue: Math.max(totalAmount - existingFolio.paidAmount, 0),
      status: deriveStatus(totalAmount, existingFolio.paidAmount),
      charges: [charge, ...existingFolio.charges]
    };

    if (folioIndex >= 0) {
      data.folios[folioIndex] = updatedFolio;
    } else {
      data.folios.unshift(updatedFolio);
    }

    syncReservationBalance(data, propertyId, input.reservationId, updatedFolio.balanceDue);

    return {
      charge,
      folio: updatedFolio
    };
  });
}

export async function createPayment(propertyId: string, input: CreatePayment) {
  return updateHotelData(async (data) => {
    const existing = data.payments.find(
      (payment) => payment.propertyId === propertyId && payment.id === `pay_${input.idempotencyKey}`
    );
    if (existing) {
      const folio = data.folios.find(
        (entry) => entry.propertyId === propertyId && entry.reservationId === existing.reservationId
      );
      return { payment: existing as PaymentRecord, folio: (folio ?? null) as FolioDetails | null };
    }

    const payment: PaymentRecord = {
      id: `pay_${input.idempotencyKey}`,
      reservationId: input.reservationId,
      guestName: input.guestName,
      amount: input.amount,
      method: input.method,
      receivedAt: new Date().toISOString(),
      note: input.note
    };

    data.payments.unshift({ ...payment, propertyId });

    const folioIndex = data.folios.findIndex(
      (folio) => folio.propertyId === propertyId && folio.reservationId === input.reservationId
    );
    const currentFolio =
      folioIndex >= 0
        ? data.folios[folioIndex]
        : buildDefaultFolio(propertyId, input.reservationId, input.guestName);

    const paidAmount = currentFolio.paidAmount + input.amount;
    const updatedFolio = {
      ...currentFolio,
      guestName: input.guestName,
      paidAmount,
      balanceDue: Math.max(currentFolio.totalAmount - paidAmount, 0),
      status: deriveStatus(currentFolio.totalAmount, paidAmount),
      payments: [payment, ...currentFolio.payments]
    };

    if (folioIndex >= 0) {
      data.folios[folioIndex] = updatedFolio;
    } else {
      data.folios.unshift(updatedFolio);
    }

    syncReservationBalance(data, propertyId, updatedFolio.reservationId, updatedFolio.balanceDue);

    return {
      payment,
      folio: updatedFolio
    };
  });
}

export async function negatePayment(propertyId: string, id: string, note: string) {
  return updateHotelData(async (data) => {
    const existing = data.payments.find((payment) => payment.propertyId === propertyId && payment.id === id);
    if (!existing) {
      return null;
    }

    const reversal: PaymentRecord = {
      id: `${id}_reversal_${Date.now()}`,
      reservationId: existing.reservationId,
      guestName: existing.guestName,
      amount: -existing.amount,
      method: existing.method,
      receivedAt: new Date().toISOString(),
      note
    };
    data.payments.unshift({ ...reversal, propertyId });

    const folioIndex = data.folios.findIndex(
      (folio) => folio.propertyId === propertyId && folio.reservationId === existing.reservationId
    );
    if (folioIndex >= 0) {
      const currentFolio = data.folios[folioIndex];
      const paidAmount = Math.max(currentFolio.paidAmount - existing.amount, 0);
      const updatedFolio = {
        ...currentFolio,
        paidAmount,
        balanceDue: Math.max(currentFolio.totalAmount - paidAmount, 0),
        status: deriveStatus(currentFolio.totalAmount, paidAmount),
        payments: [reversal, ...currentFolio.payments]
      };
      data.folios[folioIndex] = updatedFolio;
      syncReservationBalance(data, propertyId, existing.reservationId, updatedFolio.balanceDue);
    }

    return reversal;
  });
}
