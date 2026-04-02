import type {
  CreatePaymentLink,
  FiscalizationInfo,
  PaymentMethod,
  PaymentProvider,
  PaymentRecord,
  PaymentLink
} from "@hotel-crm/shared/payments";

type AcquiringAdapter = {
  provider: PaymentProvider;
  createPaymentLink: (input: CreatePaymentLink) => PaymentLink;
};

type FiscalizationAdapter = {
  provider: FiscalizationInfo["provider"];
  registerSale: (payment: Pick<PaymentRecord, "amount" | "method" | "kind" | "correlationId">) => FiscalizationInfo;
  registerRefund: (payment: Pick<PaymentRecord, "amount" | "method" | "kind" | "correlationId">) => FiscalizationInfo;
};

function buildFiscalizationInfo(
  provider: FiscalizationInfo["provider"],
  payment: Pick<PaymentRecord, "amount" | "method" | "kind" | "correlationId">,
  mode: "sale" | "refund"
): FiscalizationInfo {
  const now = new Date().toISOString();

  if (payment.method === "bank_transfer") {
    return {
      provider,
      status: "pending",
      receiptNumber: "",
      requestedAt: now,
      acknowledgedAt: null,
      errorMessage: ""
    };
  }

  return {
    provider,
    status: mode === "sale" ? "sent" : "pending",
    receiptNumber: `${provider}_${mode}_${Date.now()}`,
    requestedAt: now,
    acknowledgedAt: mode === "sale" && payment.method === "cash" ? now : null,
    errorMessage: ""
  };
}

function buildLink(provider: PaymentProvider, input: CreatePaymentLink) {
  return {
    id: `plink_${provider}_${Date.now()}`,
    reservationId: input.reservationId,
    guestName: input.guestName,
    amount: input.amount,
    method: input.method,
    provider,
    url: `https://payments.demo.local/${provider}/${input.reservationId}?amount=${input.amount}`,
    status: "sent" as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lastSentAt: new Date().toISOString(),
    note: input.note
  };
}

const acquiringAdapters: Record<Exclude<PaymentMethod, "cash" | "card" | "bank_transfer">, AcquiringAdapter> = {
  sbp: {
    provider: "sbp",
    createPaymentLink: (input) => buildLink("sbp", input)
  },
  yookassa: {
    provider: "yookassa",
    createPaymentLink: (input) => buildLink("yookassa", input)
  },
  tbank: {
    provider: "tbank",
    createPaymentLink: (input) => buildLink("tbank", input)
  }
};

const fiscalizationAdapters: Record<Exclude<FiscalizationInfo["provider"], "none">, FiscalizationAdapter> = {
  atol: {
    provider: "atol",
    registerSale: (payment) => buildFiscalizationInfo("atol", payment, "sale"),
    registerRefund: (payment) => buildFiscalizationInfo("atol", payment, "refund")
  },
  shtrih_m: {
    provider: "shtrih_m",
    registerSale: (payment) => buildFiscalizationInfo("shtrih_m", payment, "sale"),
    registerRefund: (payment) => buildFiscalizationInfo("shtrih_m", payment, "refund")
  }
};

export function resolveAcquiringAdapter(method: CreatePaymentLink["method"]) {
  return acquiringAdapters[method];
}

export function resolveFiscalizationAdapter(provider: Exclude<FiscalizationInfo["provider"], "none"> = "atol") {
  return fiscalizationAdapters[provider];
}

