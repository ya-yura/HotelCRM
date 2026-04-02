import { useState } from "react";
import type { CreateCharge, CreatePayment } from "@hotel-crm/shared/payments";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { chargeTypeLabel, folioStatusLabel, paymentMethodLabel } from "../lib/ru";

const defaultForm: CreatePayment = {
  reservationId: "resv_demo_2",
  guestName: "Сергей Иванов",
  amount: 0,
  method: "cash",
  note: "",
  idempotencyKey: `pay_local_${Date.now()}`
};

const defaultChargeForm: CreateCharge = {
  reservationId: "resv_demo_2",
  guestName: "Сергей Иванов",
  type: "breakfast",
  description: "",
  amount: 0,
  idempotencyKey: `charge_local_${Date.now()}`
};

export function PaymentsPage() {
  const { hasAnyRole } = useAuth();
  const { folios, folioDetails, payments, addFolioCharge, recordPayment } = useHotelStore();
  const canOperatePayments = hasAnyRole(["owner", "frontdesk", "accountant"]);
  const [form, setForm] = useState<CreatePayment>(defaultForm);
  const [chargeForm, setChargeForm] = useState<CreateCharge>(defaultChargeForm);

  function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.amount <= 0) {
      return;
    }

    recordPayment(form);
    setForm({
      ...defaultForm,
      idempotencyKey: `pay_local_${Date.now()}`
    });
  }

  function submitCharge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chargeForm.amount <= 0 || !chargeForm.description.trim()) {
      return;
    }

    addFolioCharge(chargeForm);
    setChargeForm({
      ...defaultChargeForm,
      idempotencyKey: `charge_local_${Date.now()}`
    });
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Оплаты</p>
        <h2>Деньги, услуги и остатки по гостям</h2>
        <p className="muted">
          Всё денежное состояние должно быть видно сразу. Выезд зависит от правды в folio, а не от памяти администратора.
        </p>
      </section>

      <section className="grid">
        <article className="card tone-warning">
          <p className="card-title">Неоплаченные folio</p>
          <strong className="card-value">
            {folios.filter((folio) => folio.status !== "paid").length}
          </strong>
          <p className="card-detail">Нужно закрыть до выезда</p>
        </article>
        <article className="card tone-success">
          <p className="card-title">Принято оплат</p>
          <strong className="card-value">
            {payments.reduce((sum, payment) => sum + payment.amount, 0)}
          </strong>
          <p className="card-detail">По всем способам оплаты</p>
        </article>
      </section>

      {canOperatePayments ? (
        <>
          <section className="panel">
            <p className="eyebrow">Услуги и доплаты</p>
            <form className="form-grid" onSubmit={submitCharge}>
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
                <span>Тип услуги</span>
                <select
                  value={chargeForm.type}
                  onChange={(event) =>
                    setChargeForm((current) => ({
                      ...current,
                      type: event.target.value as CreateCharge["type"]
                    }))
                  }
                >
                  <option value="breakfast">Завтрак</option>
                  <option value="parking">Парковка</option>
                  <option value="laundry">Прачечная</option>
                  <option value="minibar">Мини-бар</option>
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
                  placeholder="Завтрак, мини-бар, поздний выезд, трансфер"
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
              <button className="primary-button" type="submit">
                Добавить начисление
              </button>
            </form>
          </section>

          <section className="panel">
            <p className="eyebrow">Приём оплаты</p>
            <form className="form-grid" onSubmit={submitPayment}>
              <label>
                <span>ID брони</span>
                <input
                  value={form.reservationId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reservationId: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Гость</span>
                <input
                  value={form.guestName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Сумма</span>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                />
              </label>

              <label>
                <span>Способ оплаты</span>
                <select
                  value={form.method}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      method: event.target.value as CreatePayment["method"]
                    }))
                  }
                >
                  <option value="cash">Наличные</option>
                  <option value="card">Карта</option>
                  <option value="bank_transfer">Перевод</option>
                </select>
              </label>

              <label>
                <span>Комментарий</span>
                <input
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Предоплата, доплата, исправление"
                />
              </label>

              <button className="primary-button" type="submit">
                Провести оплату
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
              <p className="eyebrow">{folioStatusLabel(folio.status)}</p>
              <h3>{folio.guestName}</h3>
              <p className="muted">Бронь: {folio.reservationId}</p>
              <p className="muted">Всего: {folio.totalAmount}</p>
              <p className="muted">Оплачено: {folio.paidAmount}</p>
              <p className="muted">Остаток: {folio.balanceDue}</p>
              {detail?.charges.length ? (
                <div className="screen compact-stack">
                  {detail.charges.map((charge) => (
                    <div className="inset-panel" key={charge.id}>
                      <p className="eyebrow">{chargeTypeLabel(charge.type)}</p>
                      <p className="muted">
                        {charge.description} • {charge.amount}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {detail?.payments.length ? (
                <div className="screen compact-stack">
                  {detail.payments.map((payment) => (
                    <div className="inset-panel" key={payment.id}>
                      <p className="eyebrow">{paymentMethodLabel(payment.method)}</p>
                      <p className="muted">
                        {payment.amount} • {payment.note || "Без комментария"}
                      </p>
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
