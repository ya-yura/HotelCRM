import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AzBookingService, AzBookingView, AzRoom, AzSettlement } from "@hotel-crm/shared/features/azhotel_core";
import {
  listAzBookingsRequest,
  listAzRoomsRequest,
  performAzCheckInRequest,
  quoteAzCheckInRequest
} from "../../lib/api";
import { azRoomStatusLabel, azRoomTypeLabel } from "../azhotel_rooms/roomLabels";
import { azBookingStatusLabel } from "../azhotel_bookings/bookingLabels";
import { ExtrasEditor } from "./ExtrasEditor";
import { normalizeExtras } from "./extras";

export function CheckInFlowPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<AzBookingView[]>([]);
  const [rooms, setRooms] = useState<AzRoom[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get("bookingId") ?? "");
  const [roomId, setRoomId] = useState("");
  const [services, setServices] = useState<AzBookingService[]>([]);
  const [quote, setQuote] = useState<AzSettlement | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const candidates = useMemo(
    () => bookings.filter((booking) => booking.status === "draft" || booking.status === "confirmed"),
    [bookings]
  );
  const selectedBooking = candidates.find((booking) => booking.id === selectedId) ?? null;
  const availableRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.id === selectedBooking?.roomId || room.status === "available" || room.status === "clean"
      ),
    [rooms, selectedBooking?.roomId]
  );

  useEffect(() => {
    setIsLoading(true);
    setError("");
    void Promise.all([listAzBookingsRequest(), listAzRoomsRequest()])
      .then(([bookingItems, roomItems]) => {
        setBookings(bookingItems);
        setRooms(roomItems);
        const nextSelected =
          (searchParams.get("bookingId") &&
          bookingItems.some((booking) => booking.id === searchParams.get("bookingId"))
            ? searchParams.get("bookingId")
            : bookingItems.find((booking) => booking.status === "draft" || booking.status === "confirmed")?.id) ?? "";
        setSelectedId(nextSelected);
        const booking = bookingItems.find((entry) => entry.id === nextSelected);
        setRoomId(booking?.roomId ?? roomItems[0]?.id ?? "");
        setServices(booking?.services ?? []);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить поток заселения")
      )
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBooking || !roomId) {
      setQuote(null);
      return;
    }

    setError("");
    void quoteAzCheckInRequest(selectedBooking.id, {
      roomId,
      services: normalizeExtras(services)
    })
      .then(setQuote)
      .catch((cause) => {
        setQuote(null);
        setError(cause instanceof Error ? cause.message : "Не удалось посчитать заезд");
      });
  }, [selectedBooking?.id, roomId, services]);

  function handleSelectBooking(bookingId: string) {
    const booking = candidates.find((entry) => entry.id === bookingId);
    setSelectedId(bookingId);
    setSearchParams(bookingId ? { bookingId } : {});
    setRoomId(booking?.roomId ?? "");
    setServices(booking?.services ?? []);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBooking || !roomId) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const result = await performAzCheckInRequest(selectedBooking.id, {
        roomId,
        services: normalizeExtras(services)
      });
      setQuote(result);
      const refreshed = await listAzBookingsRequest();
      setBookings(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить заселение");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Заселение</p>
        <h2>Быстрый заезд гостя</h2>
        <p className="muted">Выберите бронь, при необходимости смените номер, добавьте услуги и подтвердите заселение.</p>
        <div className="status-actions">
          <Link className="secondary-link" to="/shahmatka/check-out">
            Перейти к выселению
          </Link>
          <Link className="secondary-link" to="/shahmatka/bookings">
            Назад в шахматку
          </Link>
        </div>
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем брони на заезд...</p>
        </section>
      ) : null}

      {!isLoading && candidates.length === 0 ? (
        <section className="panel">
          <p className="muted">Нет броней, готовых к заселению. Подтвердите бронь в шахматке или создайте новую.</p>
        </section>
      ) : null}

      {!isLoading && candidates.length > 0 ? (
        <>
          <section className="panel">
            <label>
              <span>Бронь для заселения</span>
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
                  {selectedBooking.dates.checkIn} - {selectedBooking.dates.checkOut} • канал: {selectedBooking.channel}
                </p>
                <label>
                  <span>Номер для заселения</span>
                  <select value={roomId} onChange={(event) => setRoomId(event.target.value)}>
                    {availableRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.number} • {azRoomTypeLabel(room.type)} • {azRoomStatusLabel(room.status)}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <ExtrasEditor services={services} onChange={setServices} />

              {quote ? (
                <section className="panel">
                  <p className="eyebrow">Итог по заезду</p>
                  <div className="settlement-grid">
                    <div>
                      <span className="muted">Номер</span>
                      <strong>{quote.roomNumber}</strong>
                    </div>
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
                    <span>Итого к проживанию</span>
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
                    {isSaving ? "Заселяем..." : "Заселить гостя"}
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

