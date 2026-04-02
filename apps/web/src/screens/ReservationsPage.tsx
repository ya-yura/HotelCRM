import { Link } from "react-router-dom";
import { useState, type FormEvent } from "react";
import type { ReservationCreate } from "@hotel-crm/shared/reservations";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { formatDateLabel, reservationSourceLabel, roomShortLabel } from "../lib/ru";

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
}

function buildBoardDays(reservations: { checkInDate: string }[]) {
  const anchor =
    reservations.length > 0
      ? startOfDay(
          [...reservations]
            .sort((left, right) => left.checkInDate.localeCompare(right.checkInDate))[0]
            .checkInDate
        )
      : startOfDay("2026-03-25");

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() + index);
    return next;
  });
}

function createDefaultForm(): ReservationCreate {
  return {
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    checkInDate: "2026-03-25",
    checkOutDate: "2026-03-26",
    adultCount: 2,
    childCount: 0,
    roomTypeId: "standard",
    totalAmount: 0,
    depositRequired: 0,
    notes: "",
    source: "phone",
    idempotencyKey: `local_${Date.now()}`
  };
}

const defaultForm: ReservationCreate = createDefaultForm();

export function ReservationsPage() {
  const { hasAnyRole } = useAuth();
  const { reservations, createReservation } = useHotelStore();
  const canEditReservations = hasAnyRole(["owner", "manager", "frontdesk"]);
  const [form, setForm] = useState<ReservationCreate>(defaultForm);
  const boardDays = buildBoardDays(reservations);
  const boardRows = Array.from(
    new Set(
      reservations.map((reservation) =>
        reservation.roomLabel === "UNASSIGNED" ? "Не назначен" : `Номер ${reservation.roomLabel}`
      )
    )
  );

  function updateField<Key extends keyof ReservationCreate>(key: Key, value: ReservationCreate[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.guestName.trim()) {
      return;
    }

    createReservation(form);
    setForm(createDefaultForm());
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Брони</p>
        <h2>Быстрое создание брони</h2>
        <p className="muted">
          Здесь администратор должен за минуту завести бронь и сразу увидеть её в загрузке.
        </p>
      </section>

      {canEditReservations ? (
        <section className="panel">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Гость</span>
              <input
                value={form.guestName}
                onChange={(event) => updateField("guestName", event.target.value)}
                placeholder="Анна Петрова"
              />
            </label>

            <label>
              <span>Телефон</span>
              <input
                value={form.guestPhone ?? ""}
                onChange={(event) => updateField("guestPhone", event.target.value)}
                placeholder="+7 999 000 00 00"
              />
            </label>

            <label>
              <span>Email</span>
              <input
                value={form.guestEmail ?? ""}
                onChange={(event) => updateField("guestEmail", event.target.value)}
                placeholder="guest@example.com"
              />
            </label>

            <label>
              <span>Заезд</span>
              <input
                type="date"
                value={form.checkInDate}
                onChange={(event) => updateField("checkInDate", event.target.value)}
              />
            </label>

            <label>
              <span>Выезд</span>
              <input
                type="date"
                value={form.checkOutDate}
                onChange={(event) => updateField("checkOutDate", event.target.value)}
              />
            </label>

            <label>
              <span>Тип номера</span>
              <select
                value={form.roomTypeId}
                onChange={(event) => updateField("roomTypeId", event.target.value)}
              >
                <option value="standard">Стандарт</option>
                <option value="double">Двухместный</option>
                <option value="family">Семейный</option>
              </select>
            </label>

            <label>
              <span>Источник</span>
              <select
                value={form.source}
                onChange={(event) =>
                  updateField("source", event.target.value as ReservationCreate["source"])
                }
              >
                <option value="phone">{reservationSourceLabel("phone")}</option>
                <option value="walk_in">{reservationSourceLabel("walk_in")}</option>
                <option value="whatsapp">{reservationSourceLabel("whatsapp")}</option>
                <option value="ota">{reservationSourceLabel("ota")}</option>
                <option value="manual">{reservationSourceLabel("manual")}</option>
              </select>
            </label>

            <label>
              <span>Сумма</span>
              <input
                type="number"
                min="0"
                value={form.totalAmount}
                onChange={(event) => updateField("totalAmount", Number(event.target.value))}
              />
            </label>

            <label>
              <span>Депозит</span>
              <input
                type="number"
                min="0"
                value={form.depositRequired ?? 0}
                onChange={(event) => updateField("depositRequired", Number(event.target.value))}
              />
            </label>

            <label>
              <span>Комментарий</span>
              <input
                value={form.notes ?? ""}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Поздний заезд, нужна детская кровать"
              />
            </label>

            <button className="primary-button" type="submit">
              Сохранить бронь
            </button>
          </form>
        </section>
      ) : (
        <section className="panel">
          <p className="eyebrow">Только просмотр</p>
          <p className="muted">
            Эта роль может смотреть брони, но создавать и менять их может только владелец или администратор.
          </p>
        </section>
      )}

      <section className="panel">
        <p className="eyebrow">Шахматка</p>
        <h3>Загрузка номеров на ближайшие 7 дней</h3>
        <p className="muted">
          Здесь видно занятые ночи, неназначенные брони и пустоты в плане размещения.
        </p>
        <div className="booking-board">
          <div className="booking-board-header">
            <div className="booking-board-corner">Номер</div>
            {boardDays.map((day) => (
              <div className="booking-board-day" key={day.toISOString()}>
                {formatDayLabel(day)}
              </div>
            ))}
          </div>

          {boardRows.length === 0 ? (
            <p className="muted">Броней пока нет. Создайте первую бронь, чтобы начать заполнять шахматку.</p>
          ) : (
            boardRows.map((row) => (
              <div className="booking-board-row" key={row}>
                <div className="booking-board-room">{row}</div>
                {boardDays.map((day) => {
                  const dayKey = day.toISOString().slice(0, 10);
                  const match = reservations.find((reservation) => {
                    const reservationRow =
                      reservation.roomLabel === "UNASSIGNED"
                        ? "Не назначен"
                        : `Номер ${reservation.roomLabel}`;
                    return (
                      reservationRow === row &&
                      reservation.checkInDate <= dayKey &&
                      reservation.checkOutDate > dayKey
                    );
                  });

                  return (
                    <div
                      className={match ? "booking-board-cell booked" : "booking-board-cell"}
                      key={`${row}_${dayKey}`}
                      title={match ? `${match.guestName} • ${match.status}` : "Свободно"}
                    >
                      {match ? `${match.guestName.split(" ")[0]} · ${match.status === "confirmed" ? "Подтвержд." : match.status === "checked_in" ? "Прож." : match.status === "draft" ? "Черн." : "Бронь"}` : ""}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="screen reservation-list">
        {reservations.map((reservation) => (
          <article className="panel" key={reservation.id}>
            <p className="eyebrow">{roomShortLabel(reservation.roomLabel)}</p>
            <h3>{reservation.guestName}</h3>
            <p className="muted">
              {formatDateLabel(reservation.checkInDate)} - {formatDateLabel(reservation.checkOutDate)}
            </p>
            <p className="muted">К оплате: {reservation.balanceDue}</p>
            <p className="muted">Источник: {reservationSourceLabel(reservation.source ?? "manual")}</p>
            <Link className="secondary-link" to={`/reservations/${reservation.id}`}>
              Открыть бронь
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
