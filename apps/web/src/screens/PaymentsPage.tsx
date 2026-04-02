import { useMemo, useState } from "react";
import type {
  CreateCharge,
  CreatePayment,
  CreatePaymentLink,
  FolioCorrection,
  PaymentRecord
} from "@hotel-crm/shared/payments";
import {
  createChargeRequest,
  createFolioCorrectionRequest,
  createPaymentLinkRequest,
  recordPaymentRequest,
  refundPaymentRequest,
  voidPaymentRequest
} from "../lib/api";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import {
  chargeTypeLabel,
  fiscalStatusLabel,
  folioStatusLabel,
  paymentKindLabel,
  paymentLinkStatusLabel,
  paymentMethodLabel
} from "../lib/ru";

function paymentProviderForMethod(method: CreatePayment["method"]): PaymentRecord["provider"] {
  if (method === "sbp") {
    return "sbp";
  }
  if (method === "yookassa") {
    return "yookassa";
  }
  if (method === "tbank") {
    return "tbank";
  }
  return "manual";
}

const defaultPaymentForm: CreatePayment = {
  reservationId: "resv_demo_2",
  guestName: "Сергей Иванов",
  amount: 0,
  method: "cash",
  provider: "manual",
  kind: "payment",
  note: "",
  reason: "",
  correlationId: "",
  paymentLinkId: null,
  idempotencyKey: `pay_local_${Date.now()}`
};

const defaultChargeForm: CreateCharge = {
  reservationId: "resv_demo_2",
  guestName: "Сергей Иванов",
  type: "breakfast",
  description: "",
  amount: 0,
  reason: "",
  correlationId: "",
  idempotencyKey: `charge_local_${Date.now()}`
};

const defaultLinkForm: CreatePaymentLink = {
  reservationId: "resv_demo_2",
  guestName: "Сергей Иванов",
  amount: 0,
  method: "sbp",
  note: "",
  correlationId: ""
};

const defaultCorrectionForm: FolioCorrection = {
  reservationId: "resv_demo_2",
  guestName: "Сергей Иванов",
  amount: 0,
  direction: "increase_balance",
  description: "",
  reason: "",
  correlationId: "",
  idempotencyKey: `corr_local_${Date.now()}`
};

export function PaymentsPage() {
  const { hasAnyRole } = useAuth();
  const { folios, folioDetails, payments, reloadFromRemote } = useHotelStore();
  const canOperatePayments = hasAnyRole(["owner", "manager", "frontdesk", "accountant"]);
  const [paymentForm, setPaymentForm] = useState<CreatePayment>(defaultPaymentForm);
  const [chargeForm, setChargeForm] = useState<CreateCharge>(defaultChargeForm);
  const [linkForm, setLinkForm] = useState<CreatePaymentLink>(defaultLinkForm);
  const [correctionForm, setCorrectionForm] = useState<FolioCorrection>(defaultCorrectionForm);
  const [feedback, setFeedback] = useState("");

  const unsettledFolios = useMemo(
    () => folios.filter((folio) => folio.status !== "paid").length,
    [folios]
  );

  async function runOperation(action: () => Promise<unknown>, successText: string, reset?: () => void) {
    setFeedback("");
    try {
      await action();
      await reloadFromRemote();
      reset?.();
      setFeedback(successText);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Не удалось выполнить финансовую операцию.");
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Оплаты</p>
        <h2>Folio, ссылки на оплату и фискальные статусы</h2>
        <p className="muted">
          В одной ленте видно начисления, оплаты, возвраты, ссылки и зависшие чеки. Выезд блокируется долгом, а спорные операции требуют повышенного подтверждения.
        </p>
        {feedback ? <p className="muted">{feedback}</p> : null}
      </section>

      <section className="grid">
        <article className="card tone-warning">
          <p className="card-title">Неоплаченные folio</p>
          <strong className="card-value">{unsettledFolios}</strong>
          <p className="card-detail">Нужно закрыть до выезда</p>
        </article>
        <article className="card tone-success">
          <p className="card-title">Денег принято</p>
          <strong className="card-value">
            {payments.reduce((sum, payment) => sum + payment.amount, 0)}
          </strong>
          <p className="card-detail">С учётом возвратов и сторно</p>
        </article>
        <article className="card tone-info">
          <p className="card-title">Чеки в очереди</p>
          <strong className="card-value">
            {folios.reduce((sum, folio) => sum + folio.pendingFiscalReceipts, 0)}
          </strong>
          <p className="card-detail">Нужно дождаться подтверждения кассы</p>
        </article>
      </section>

      {canOperatePayments ? (
        <>
          <section className="panel">
            <p className="eyebrow">Приём оплаты</p>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (paymentForm.amount <= 0) {
                  return;
                }
                void runOperation(
                  () =>
                    recordPaymentRequest({
                      ...paymentForm,
                      provider: paymentProviderForMethod(paymentForm.method),
                      correlationId: paymentForm.correlationId || `folio_payment_${Date.now()}`
                    }),
                  "Оплата проведена и отправлена в финансовый контур.",
                  () =>
                    setPaymentForm({
                      ...defaultPaymentForm,
                      idempotencyKey: `pay_local_${Date.now()}`
                    })
                );
              }}
            >
              <label>
                <span>ID брони</span>
                <input
                  value={paymentForm.reservationId}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, reservationId: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Гость</span>
                <input
                  value={paymentForm.guestName}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Сумма</span>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                <span>Способ оплаты</span>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      method: event.target.value as CreatePayment["method"]
                    }))
                  }
                >
                  <option value="cash">Наличные</option>
                  <option value="card">Карта</option>
                  <option value="bank_transfer">Перевод</option>
                  <option value="sbp">СБП</option>
                  <option value="yookassa">ЮKassa</option>
                  <option value="tbank">T-Bank</option>
                </select>
              </label>
              <label>
                <span>Комментарий</span>
                <input
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Предоплата, доплата, оплата при выезде"
                />
              </label>
              <label>
                <span>Причина</span>
                <input
                  value={paymentForm.reason}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Основание операции"
                />
              </label>
              <button className="primary-button" type="submit">
                Провести оплату
              </button>
            </form>
          </section>

          <section className="panel">
            <p className="eyebrow">Ссылка на оплату</p>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (linkForm.amount <= 0) {
                  return;
                }
                void runOperation(
                  () =>
                    createPaymentLinkRequest({
                      ...linkForm,
                      correlationId: linkForm.correlationId || `plink_${Date.now()}`
                    }),
                  "Ссылка на оплату создана.",
                  () => setLinkForm(defaultLinkForm)
                );
              }}
            >
              <label>
                <span>ID брони</span>
                <input
                  value={linkForm.reservationId}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, reservationId: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Гость</span>
                <input
                  value={linkForm.guestName}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Сумма</span>
                <input
                  type="number"
                  min="0"
                  value={linkForm.amount}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                <span>Провайдер</span>
                <select
                  value={linkForm.method}
                  onChange={(event) =>
                    setLinkForm((current) => ({
                      ...current,
                      method: event.target.value as CreatePaymentLink["method"]
                    }))
                  }
                >
                  <option value="sbp">СБП</option>
                  <option value="yookassa">ЮKassa</option>
                  <option value="tbank">T-Bank</option>
                </select>
              </label>
              <label>
                <span>Комментарий</span>
                <input
                  value={linkForm.note}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Предоплата по ссылке"
                />
              </label>
              <button className="secondary-button" type="submit">
                Сгенерировать ссылку
              </button>
            </form>
          </section>

          <section className="panel">
            <p className="eyebrow">Начисления и корректировки</p>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (chargeForm.amount <= 0 || !chargeForm.description.trim()) {
                  return;
                }
                void runOperation(
                  () =>
                    createChargeRequest({
                      ...chargeForm,
                      correlationId: chargeForm.correlationId || `charge_${Date.now()}`
                    }),
                  "Начисление добавлено в folio.",
                  () =>
                    setChargeForm({
                      ...defaultChargeForm,
                      idempotencyKey: `charge_local_${Date.now()}`
                    })
                );
              }}
            >
              <label>
                <span>ID брони</span>
                <input
                  value={chargeForm.reservationId}
                  onChange={(event) =>
                    setChargeForm((current) => ({ ...current, reservationId: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Гость</span>
                <input
                  value={chargeForm.guestName}
                  onChange={(event) =>
                    setChargeForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Тип</span>
                <select
                  value={chargeForm.type}
                  onChange={(event) =>
                    setChargeForm((current) => ({
                      ...current,
                      type: event.target.value as CreateCharge["type"]
                    }))
                  }
                >
                  <option value="room">Проживание</option>
                  <option value="service">Услуга</option>
                  <option value="breakfast">Завтрак</option>
                  <option value="parking">Парковка</option>
                  <option value="laundry">Прачечная</option>
                  <option value="minibar">Мини-бар</option>
                  <option value="damage">Порча имущества</option>
                  <option value="tax_fee">Сбор / налог</option>
                  <option value="discount">Скидка</option>
                  <option value="other">Другое</option>
                </select>
              </label>
              <label>
                <span>Описание</span>
                <input
                  value={chargeForm.description}
                  onChange={(event) =>
                    setChargeForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Поздний выезд, мини-бар, трансфер"
                />
              </label>
              <label>
                <span>Сумма</span>
                <input
                  type="number"
                  min="0"
                  value={chargeForm.amount}
                  onChange={(event) =>
                    setChargeForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                <span>Причина</span>
                <input
                  value={chargeForm.reason}
                  onChange={(event) =>
                    setChargeForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Основание для начисления"
                />
              </label>
              <button className="primary-button" type="submit">
                Добавить начисление
              </button>
            </form>

            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (correctionForm.amount <= 0 || !correctionForm.reason.trim() || !correctionForm.description.trim()) {
                  return;
                }
                void runOperation(
                  () =>
                    createFolioCorrectionRequest({
                      ...correctionForm,
                      correlationId: correctionForm.correlationId || `correction_${Date.now()}`
                    }),
                  "Корректировка проведена.",
                  () =>
                    setCorrectionForm({
                      ...defaultCorrectionForm,
                      idempotencyKey: `corr_local_${Date.now()}`
                    })
                );
              }}
            >
              <label>
                <span>ID брони</span>
                <input
                  value={correctionForm.reservationId}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({ ...current, reservationId: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Гость</span>
                <input
                  value={correctionForm.guestName}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Направление</span>
                <select
                  value={correctionForm.direction}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({
                      ...current,
                      direction: event.target.value as FolioCorrection["direction"]
                    }))
                  }
                >
                  <option value="increase_balance">Увеличить долг</option>
                  <option value="decrease_balance">Уменьшить долг</option>
                </select>
              </label>
              <label>
                <span>Сумма</span>
                <input
                  type="number"
                  min="0"
                  value={correctionForm.amount}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                <span>Описание</span>
                <input
                  value={correctionForm.description}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Ошибка смены, менеджерская корректировка"
                />
              </label>
              <label>
                <span>Причина</span>
                <input
                  value={correctionForm.reason}
                  onChange={(event) =>
                    setCorrectionForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Почему нужна корректировка"
                />
              </label>
              <button className="secondary-button" type="submit">
                Провести корректировку
              </button>
            </form>
          </section>
        </>
      ) : null}

      <section className="screen">
        {folios.map((folio) => {
          const detail = folioDetails.find((entry) => entry.reservationId === folio.reservationId);
          return (
            <article className="panel" key={folio.reservationId}>
              <p className="eyebrow">
                {folioStatusLabel(folio.status)} • чеков в очереди {folio.pendingFiscalReceipts}
              </p>
              <h3>{folio.guestName}</h3>
              <p className="muted">Бронь: {folio.reservationId}</p>
              <p className="muted">Всего: {folio.totalAmount}</p>
              <p className="muted">Оплачено: {folio.paidAmount}</p>
              <p className="muted">Остаток: {folio.balanceDue}</p>

              {detail?.paymentLinks.length ? (
                <div className="screen compact-stack">
                  {detail.paymentLinks.map((link) => (
                    <div className="inset-panel" key={link.id}>
                      <p className="eyebrow">
                        Ссылка • {paymentMethodLabel(link.method)} • {paymentLinkStatusLabel(link.status)}
                      </p>
                      <p className="muted">{link.amount} • {link.note || "Без комментария"}</p>
                      <p className="muted">{link.url}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {detail?.lines.length ? (
                <div className="screen compact-stack">
                  {detail.lines.map((line) => (
                    <div className="inset-panel" key={line.id}>
                      <p className="eyebrow">
                        {line.kind === "charge" ? line.title : line.title}
                      </p>
                      <p className="muted">
                        {line.amount} • {line.description}
                      </p>
                      <p className="muted">Фискальный статус: {fiscalStatusLabel(line.fiscalStatus)}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {detail?.payments.length ? (
                <div className="screen compact-stack">
                  {detail.payments.map((payment) => (
                    <div className="inset-panel" key={payment.id}>
                      <p className="eyebrow">
                        {paymentKindLabel(payment.kind)} • {paymentMethodLabel(payment.method)}
                      </p>
                      <p className="muted">
                        {payment.amount} • {payment.note || payment.reason || "Без комментария"}
                      </p>
                      <p className="muted">
                        Чек: {fiscalStatusLabel(payment.fiscalization.status)}
                        {payment.fiscalization.receiptNumber ? ` • ${payment.fiscalization.receiptNumber}` : ""}
                      </p>
                      {canOperatePayments && payment.amount > 0 ? (
                        <div className="status-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() =>
                              void runOperation(
                                () =>
                                  refundPaymentRequest(payment.id, {
                                    reason: "Возврат по запросу гостя",
                                    correlationId: `refund_${payment.id}_${Date.now()}`
                                  }),
                                "Возврат оформлен."
                              )
                            }
                          >
                            Возврат
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() =>
                              void runOperation(
                                () =>
                                  voidPaymentRequest(payment.id, {
                                    reason: "Сторно ошибочной операции",
                                    correlationId: `void_${payment.id}_${Date.now()}`
                                  }),
                                "Сторно оформлено."
                              )
                            }
                          >
                            Сторно
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
