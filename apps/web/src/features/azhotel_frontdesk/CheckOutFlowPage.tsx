import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AzBookingService, AzBookingView, AzSettlement } from "@hotel-crm/shared/features/azhotel_core";
import {
  listAzBookingsRequest,
  performAzCheckOutRequest,
  quoteAzCheckOutRequest
} from "../../lib/api";
import { azBookingStatusLabel } from "../azhotel_bookings/bookingLabels";
import { ExtrasEditor } from "./ExtrasEditor";
import { normalizeExtras } from "./extras";

export function CheckOutFlowPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<AzBookingView[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get("bookingId") ?? "");
  const [services, setServices] = useState<AzBookingService[]>([]);
  const [quote, setQuote] = useState<AzSettlement | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const candidates = useMemo(
    () => bookings.filter((booking) => booking.status === "checked_in"),
    [bookings]
  );
  const selectedBooking = candidates.find((booking) => booking.id === selectedId) ?? null;

  useEffect(() => {
    setIsLoading(true);
    setError("");
    void listAzBookingsRequest()
      .then((bookingItems) => {
        setBookings(bookingItems);
        const nextSelected =
          (searchParams.get("bookingId") &&
          bookingItems.some((booking) => booking.id === searchParams.get("bookingId"))
            ? searchParams.get("bookingId")
            : bookingItems.find((booking) => booking.status === "checked_in")?.id) ?? "";
        setSelectedId(nextSelected);
        const booking = bookingItems.find((entry) => entry.id === nextSelected);
        setServices(booking?.services ?? []);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить поток выселения")
      )
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBooking) {
      setQuote(null);
      return;
    }

    setError("");
    void quoteAzCheckOutRequest(selectedBooking.id, {
      services: normalizeExtras(services)
    })
      .then(setQuote)
      .catch((cause) => {
        setQuote(null);
        setError(cause instanceof Error ? cause.message : "Не удалось посчитать итог");
      });
  }, [selectedBooking?.id, services]);

  function handleSelectBooking(bookingId: string) {
    const booking = candidates.find((entry) => entry.id === bookingId);
    setSelectedId(bookingId);
    setSearchParams(bookingId ? { bookingId } : {});
    setServices(booking?.services ?? []);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBooking) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const result = await performAzCheckOutRequest(selectedBooking.id, {
        services: normalizeExtras(services)
      });
      setQuote(result);
      const refreshed = await listAzBookingsRequest();
      setBookings(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить выселение");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Выселение</p>
        <h2>Финальный расчёт и выезд</h2>
        <p className="muted">Выберите проживающую бронь, проверьте допуслуги и закройте проживание одним действием.</p>
        <div className="status-actions">
          <Link className="secondary-link" to="/shahmatka/check-in">
            Перейти к заселению
          </Link>
          <Link className="secondary-link" to="/shahmatka/bookings">
            Назад в шахматку
          </Link>
        </div>
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем выезды...</p>
        </section>
      ) : null}

      {!isLoading && candidates.length === 0 ? (
        <section className="panel">
          <p className="muted">Сейчас нет проживающих гостей для выселения.</p>
        </section>
      ) : null}

      {!isLoading && candidates.length > 0 ? (
        <>
          <section className="panel">
            <label>
              <span>Бронь для выселения</span>
              <select value={selectedId} onChange={(event) => handleSelectBooking(event.target.value)}>
                {candidates.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.guestName} • {booking.roomNumber} • {azBookingStatusLabel(booking.status)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {selectedBooking ? (
            <form className="screen" onSubmit={handleSubmit}>
              <section className="panel">
                <p className="eyebrow">Гость</p>
                <h3>{selectedBooking.guestName}</h3>
                <p className="muted">
                  Номер {selectedBooking.roomNumber} • {selectedBooking.dates.checkIn} - {selectedBooking.dates.checkOut}
                </p>
              </section>

              <ExtrasEditor services={services} onChange={setServices} />

              {quote ? (
                <section className="panel">
                  <p className="eyebrow">Финальный чек</p>
                  <div className="settlement-grid">
                    <div>
                      <span className="muted">Ночей</span>
                      <strong>{quote.nights}</strong>
                    </div>
                    <div>
                      <span className="muted">Проживание</span>
                      <strong>{quote.roomAmount}</strong>
                    </div>
                    <div>
                      <span className="muted">Допуслуги</span>
                      <strong>{quote.servicesAmount}</strong>
                    </div>
                    <div>
                      <span className="muted">Статус</span>
                      <strong>{azBookingStatusLabel(quote.status)}</strong>
                    </div>
                  </div>
                  <div className="settlement-lines">
                    {quote.lines.map((line) => (
                      <div className="settlement-line" key={line.id}>
                        <span>{line.title}</span>
                        <strong>{line.amount}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="settlement-total">
                    <span>К оплате / закрытию</span>
                    <strong>{quote.totalAmount}</strong>
                  </div>
                </section>
              ) : null}

              {error ? (
                <section className="panel">
                  <p className="error-text">{error}</p>
                </section>
              ) : null}

              <section className="panel">
                <div className="status-actions">
                  <button className="primary-button" type="submit" disabled={isSaving}>
                    {isSaving ? "Закрываем..." : "Выселить гостя"}
                  </button>
                </div>
              </section>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

