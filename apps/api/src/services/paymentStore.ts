import type {
  CreateCharge,
  CreatePayment,
  CreatePaymentLink,
  FiscalizationInfo,
  FolioCharge,
  FolioCorrection,
  FolioDetails,
  FolioLine,
  FolioSummary,
  PaymentLink,
  PaymentRecord,
  PaymentRefund
} from "@hotel-crm/shared/payments";
import type { PropertyScoped } from "./hotelDataTypes";
import { getHotelData, updateHotelData } from "./dataStore";
import { resolveAcquiringAdapter, resolveFiscalizationAdapter } from "./paymentAdapters";

function deriveStatus(totalAmount: number, paidAmount: number): FolioSummary["status"] {
  if (paidAmount <= 0) {
    return "unpaid";
  }
  if (paidAmount >= totalAmount) {
    return "paid";
  }
  return "partially_paid";
}

function countPendingFiscalReceipts(folio: FolioDetails) {
  return folio.payments.filter((payment) =>
    ["pending", "sent", "failed"].includes(payment.fiscalization.status)
  ).length;
}

function buildFolioLines(folio: FolioDetails): FolioLine[] {
  const chargeLines = folio.charges.map((charge) => ({
    id: `line_${charge.id}`,
    reservationId: charge.reservationId,
    createdAt: charge.postedAt,
    kind: "charge" as const,
    title: charge.type.replaceAll("_", " "),
    description: charge.description,
    amount: charge.amount,
    sourceId: charge.id,
    sourceType: "charge" as const,
    paymentMethod: null,
    fiscalStatus: "not_required" as const
  }));

  const paymentLines = folio.payments.map((payment) => ({
    id: `line_${payment.id}`,
    reservationId: payment.reservationId,
    createdAt: payment.receivedAt,
    kind: payment.kind === "refund" || payment.kind === "void" ? "refund" as const : "payment" as const,
    title: payment.kind.replaceAll("_", " "),
    description: payment.note || payment.reason || payment.method,
    amount: payment.amount,
    sourceId: payment.id,
    sourceType: "payment" as const,
    paymentMethod: payment.method,
    fiscalStatus: payment.fiscalization.status
  }));

  return [...chargeLines, ...paymentLines].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

function toFolioSummary(folio: FolioDetails): FolioSummary {
  return {
    reservationId: folio.reservationId,
    guestName: folio.guestName,
    totalAmount: folio.totalAmount,
    paidAmount: folio.paidAmount,
    balanceDue: folio.balanceDue,
    status: folio.status,
    pendingFiscalReceipts: folio.pendingFiscalReceipts
  };
}

function buildDefaultFolio(propertyId: string, reservationId: string, guestName: string): Awaited<ReturnType<typeof getHotelData>>["folios"][number] {
  return {
    propertyId,
    reservationId,
    guestName,
    totalAmount: 0,
    paidAmount: 0,
    balanceDue: 0,
    status: "unpaid",
    pendingFiscalReceipts: 0,
    charges: [],
    payments: [],
    lines: [],
    paymentLinks: []
  };
}

function normalizeFolio(folio: FolioDetails): FolioDetails {
  const normalized: FolioDetails = {
    ...folio,
    charges: folio.charges ?? [],
    payments: folio.payments ?? [],
    paymentLinks: folio.paymentLinks ?? [],
    lines: []
  };

  normalized.pendingFiscalReceipts = countPendingFiscalReceipts(normalized);
  normalized.lines = buildFolioLines(normalized);
  return normalized;
}

function syncReservationBalance(
  data: Awaited<ReturnType<typeof getHotelData>>,
  propertyId: string,
  reservationId: string,
  balanceDue: number,
  totals?: { totalAmount?: number; paidAmount?: number }
) {
  const reservationIndex = data.reservations.findIndex(
    (reservation) => reservation.propertyId === propertyId && reservation.id === reservationId
  );
  if (reservationIndex >= 0) {
    data.reservations[reservationIndex] = {
      ...data.reservations[reservationIndex],
      balanceDue,
      totalAmount: totals?.totalAmount ?? data.reservations[reservationIndex].totalAmount,
      paidAmount: totals?.paidAmount ?? data.reservations[reservationIndex].paidAmount
    };
  }
}

function upsertFolio(
  data: Awaited<ReturnType<typeof getHotelData>>,
  propertyId: string,
  reservationId: string,
  guestName: string
) {
  const folioIndex = data.folios.findIndex(
    (folio) => folio.propertyId === propertyId && folio.reservationId === reservationId
  );
  const folio = folioIndex >= 0
    ? normalizeFolio(data.folios[folioIndex] as FolioDetails)
    : buildDefaultFolio(propertyId, reservationId, guestName);

  return { folioIndex, folio };
}

function persistFolio(
  data: Awaited<ReturnType<typeof getHotelData>>,
  folioIndex: number,
  folio: FolioDetails
) {
  const normalized = normalizeFolio(folio);
  if (folioIndex >= 0) {
    data.folios[folioIndex] = {
      ...normalized,
      propertyId: data.folios[folioIndex].propertyId
    };
  } else {
    data.folios.unshift(normalized as PropertyScoped<FolioDetails>);
  }
  return normalized;
}

function chargeImpact(type: CreateCharge["type"], amount: number) {
  if (type === "discount") {
    return -amount;
  }
  return amount;
}

function buildPaymentRecord(
  input: CreatePayment,
  amount: number,
  kind: PaymentRecord["kind"],
  fiscalization: FiscalizationInfo
): PaymentRecord {
  return {
    id: `pay_${input.idempotencyKey}`,
    reservationId: input.reservationId,
    guestName: input.guestName,
    amount,
    method: input.method,
    provider: input.provider,
    kind,
    receivedAt: new Date().toISOString(),
    note: input.note,
    reason: input.reason,
    correlationId: input.correlationId,
    paymentLinkId: input.paymentLinkId,
    fiscalization
  };
}

export async function listFolios(propertyId: string) {
  return (await getHotelData()).folios
    .filter((folio) => folio.propertyId === propertyId)
    .map((folio) => toFolioSummary(normalizeFolio(folio as FolioDetails)));
}

export async function listFolioDetails(propertyId: string) {
  return (await getHotelData()).folios
    .filter((folio) => folio.propertyId === propertyId)
    .map((folio) => normalizeFolio(folio as FolioDetails));
}

export async function getFolio(propertyId: string, reservationId: string) {
  const folio = (await getHotelData()).folios.find(
    (entry) => entry.propertyId === propertyId && entry.reservationId === reservationId
  );
  return folio ? toFolioSummary(normalizeFolio(folio as FolioDetails)) : null;
}

export async function getFolioDetails(propertyId: string, reservationId: string) {
  const folio = (await getHotelData()).folios.find(
    (entry) => entry.propertyId === propertyId && entry.reservationId === reservationId
  );
  return folio ? normalizeFolio(folio as FolioDetails) : null;
}

export async function listPayments(propertyId: string) {
  return (await getHotelData()).payments
    .filter((payment) => payment.propertyId === propertyId)
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
}

export async function getPayment(propertyId: string, id: string) {
  return (await getHotelData()).payments.find(
    (payment) => payment.propertyId === propertyId && payment.id === id
  ) ?? null;
}

export async function createCharge(propertyId: string, input: CreateCharge) {
  return updateHotelData(async (data) => {
    const { folioIndex, folio } = upsertFolio(data, propertyId, input.reservationId, input.guestName);
    const chargeId = `charge_${input.idempotencyKey}`;
    const existingCharge = folio.charges.find((charge) => charge.id === chargeId);
    if (existingCharge) {
      return {
        charge: existingCharge,
        folio
      };
    }

    const signedAmount = chargeImpact(input.type, input.amount);
    const charge: FolioCharge = {
      id: chargeId,
      reservationId: input.reservationId,
      guestName: input.guestName,
      type: input.type,
      description: input.description,
      amount: signedAmount,
      postedAt: new Date().toISOString(),
      reason: input.reason,
      correlationId: input.correlationId
    };

    const totalAmount = Math.max(folio.totalAmount + signedAmount, 0);
    const updatedFolio = persistFolio(data, folioIndex, {
      ...folio,
      guestName: input.guestName,
      totalAmount,
      balanceDue: Math.max(totalAmount - folio.paidAmount, 0),
      status: deriveStatus(totalAmount, folio.paidAmount),
      charges: [charge, ...folio.charges]
    });

    syncReservationBalance(data, propertyId, input.reservationId, updatedFolio.balanceDue, {
      totalAmount: updatedFolio.totalAmount,
      paidAmount: updatedFolio.paidAmount
    });

    return {
      charge,
      folio: updatedFolio
    };
  });
}

export async function createCorrection(propertyId: string, input: FolioCorrection) {
  return updateHotelData(async (data) => {
    const { folioIndex, folio } = upsertFolio(data, propertyId, input.reservationId, input.guestName);
    const chargeId = `charge_${input.idempotencyKey}`;
    const existingCharge = folio.charges.find((charge) => charge.id === chargeId);
    if (existingCharge) {
      return {
        charge: existingCharge,
        folio
      };
    }

    const signedAmount = input.direction === "increase_balance" ? input.amount : -input.amount;
    const charge: FolioCharge = {
      id: chargeId,
      reservationId: input.reservationId,
      guestName: input.guestName,
      type: "correction",
      description: input.description,
      amount: signedAmount,
      postedAt: new Date().toISOString(),
      reason: input.reason,
      correlationId: input.correlationId
    };

    const totalAmount = Math.max(folio.totalAmount + signedAmount, 0);
    const updatedFolio = persistFolio(data, folioIndex, {
      ...folio,
      guestName: input.guestName,
      totalAmount,
      balanceDue: Math.max(totalAmount - folio.paidAmount, 0),
      status: deriveStatus(totalAmount, folio.paidAmount),
      charges: [charge, ...folio.charges]
    });

    syncReservationBalance(data, propertyId, input.reservationId, updatedFolio.balanceDue, {
      totalAmount: updatedFolio.totalAmount,
      paidAmount: updatedFolio.paidAmount
    });

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
      return {
        payment: existing as PaymentRecord,
        folio: normalizeFolio((folio ?? buildDefaultFolio(propertyId, existing.reservationId, existing.guestName)) as FolioDetails)
      };
    }

    const fiscalization = resolveFiscalizationAdapter("atol").registerSale({
      amount: input.amount,
      method: input.method,
      kind: input.kind,
      correlationId: input.correlationId
    });
    const payment = buildPaymentRecord(input, input.amount, input.kind, fiscalization);

    data.payments.unshift({ ...payment, propertyId });

    const { folioIndex, folio } = upsertFolio(data, propertyId, input.reservationId, input.guestName);
    const paidAmount = Math.max(folio.paidAmount + input.amount, 0);
    const updatedFolio = persistFolio(data, folioIndex, {
      ...folio,
      guestName: input.guestName,
      paidAmount,
      balanceDue: Math.max(folio.totalAmount - paidAmount, 0),
      status: deriveStatus(folio.totalAmount, paidAmount),
      payments: [payment, ...folio.payments],
      paymentLinks: folio.paymentLinks.map((link) =>
        link.id === input.paymentLinkId ? { ...link, status: "paid" } : link
      )
    });

    syncReservationBalance(data, propertyId, updatedFolio.reservationId, updatedFolio.balanceDue, {
      totalAmount: updatedFolio.totalAmount,
      paidAmount: updatedFolio.paidAmount
    });

    return {
      payment,
      folio: updatedFolio
    };
  });
}

export async function refundPayment(propertyId: string, id: string, input: PaymentRefund) {
  return updateHotelData(async (data) => {
    const existing = data.payments.find((payment) => payment.propertyId === propertyId && payment.id === id);
    if (!existing) {
      return null;
    }

    const refundAmount = Math.min(input.amount ?? Math.abs(existing.amount), Math.abs(existing.amount));
    const refund: PaymentRecord = {
      id: `${id}_refund_${Date.now()}`,
      reservationId: existing.reservationId,
      guestName: existing.guestName,
      amount: -refundAmount,
      method: existing.method,
      provider: existing.provider,
      kind: "refund",
      receivedAt: new Date().toISOString(),
      note: input.reason,
      reason: input.reason,
      correlationId: input.correlationId,
      paymentLinkId: existing.paymentLinkId,
      fiscalization: resolveFiscalizationAdapter("atol").registerRefund({
        amount: -refundAmount,
        method: existing.method,
        kind: "refund",
        correlationId: input.correlationId
      })
    };
    data.payments.unshift({ ...refund, propertyId });

    const { folioIndex, folio } = upsertFolio(data, propertyId, existing.reservationId, existing.guestName);
    const paidAmount = Math.max(folio.paidAmount - refundAmount, 0);
    const updatedFolio = persistFolio(data, folioIndex, {
      ...folio,
      paidAmount,
      balanceDue: Math.max(folio.totalAmount - paidAmount, 0),
      status: deriveStatus(folio.totalAmount, paidAmount),
      payments: [refund, ...folio.payments]
    });

    syncReservationBalance(data, propertyId, existing.reservationId, updatedFolio.balanceDue, {
      totalAmount: updatedFolio.totalAmount,
      paidAmount: updatedFolio.paidAmount
    });

    return {
      payment: refund,
      folio: updatedFolio
    };
  });
}

export async function voidPayment(propertyId: string, id: string, reason: string, correlationId = "") {
  return updateHotelData(async (data) => {
    const existing = data.payments.find((payment) => payment.propertyId === propertyId && payment.id === id);
    if (!existing) {
      return null;
    }

    const reversal: PaymentRecord = {
      id: `${id}_void_${Date.now()}`,
      reservationId: existing.reservationId,
      guestName: existing.guestName,
      amount: -Math.abs(existing.amount),
      method: existing.method,
      provider: existing.provider,
      kind: "void",
      receivedAt: new Date().toISOString(),
      note: reason,
      reason,
      correlationId,
      paymentLinkId: existing.paymentLinkId,
      fiscalization: resolveFiscalizationAdapter("atol").registerRefund({
        amount: -Math.abs(existing.amount),
        method: existing.method,
        kind: "void",
        correlationId
      })
    };
    data.payments.unshift({ ...reversal, propertyId });

    const { folioIndex, folio } = upsertFolio(data, propertyId, existing.reservationId, existing.guestName);
    const paidAmount = Math.max(folio.paidAmount - Math.abs(existing.amount), 0);
    const updatedFolio = persistFolio(data, folioIndex, {
      ...folio,
      paidAmount,
      balanceDue: Math.max(folio.totalAmount - paidAmount, 0),
      status: deriveStatus(folio.totalAmount, paidAmount),
      payments: [reversal, ...folio.payments]
    });

    syncReservationBalance(data, propertyId, existing.reservationId, updatedFolio.balanceDue, {
      totalAmount: updatedFolio.totalAmount,
      paidAmount: updatedFolio.paidAmount
    });

    return {
      payment: reversal,
      folio: updatedFolio
    };
  });
}

export async function createPaymentLink(propertyId: string, input: CreatePaymentLink) {
  return updateHotelData(async (data) => {
    const adapter = resolveAcquiringAdapter(input.method);
    const link = adapter.createPaymentLink(input);

    const { folioIndex, folio } = upsertFolio(data, propertyId, input.reservationId, input.guestName);
    const updatedFolio = persistFolio(data, folioIndex, {
      ...folio,
      guestName: input.guestName,
      paymentLinks: [link, ...folio.paymentLinks]
    });

    return {
      paymentLink: link,
      folio: updatedFolio
    };
  });
}
