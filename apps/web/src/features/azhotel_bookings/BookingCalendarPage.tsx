import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AzBookingView, AzRoom } from "@hotel-crm/shared/features/azhotel_core";
import { listAzBookingsRequest, listAzRoomsRequest } from "../../lib/api";
import { azhotelFrontdeskEnabled } from "../../lib/featureFlags";
import { azRoomTypeLabel } from "../azhotel_rooms/roomLabels";
import { azBookingStatusLabel, azChannelLabel, bookingToneClass } from "./bookingLabels";

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDay(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString("ru-RU", { weekday: "short" });
}

function formatRange(checkIn: string, checkOut: string) {
  return `${new Date(`${checkIn}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  })} - ${new Date(`${checkOut}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  })}`;
}

function roomStatusLabel(status: AzRoom["status"]) {
  switch (status) {
    case "available":
      return "Свободен";
    case "occupied":
      return "Занят";
    case "clean":
      return "Чистый";
    case "dirty":
      return "Грязный";
    default:
      return status;
  }
}

function isBookingVisibleInBoard(booking: AzBookingView, key: string) {
  return (
    booking.dates.checkIn <= key &&
    booking.dates.checkOut > key &&
    !["cancelled", "checked_out", "no_show"].includes(booking.status)
  );
}

const DEFAULT_FROM = "2026-03-25";
const DEFAULT_TO = "2026-03-31";

export function BookingCalendarPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<AzRoom[]>([]);
  const [bookings, setBookings] = useState<AzBookingView[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: DEFAULT_FROM,
    to: DEFAULT_TO
  });

  const calendarDays = useMemo(() => {
    const start = startOfDay(filters.from);
    const end = startOfDay(filters.to);
    const days: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [filters.from, filters.to]);

  const dateRangeLabel = useMemo(() => {
    if (calendarDays.length === 0) {
      return "";
    }

    return `${formatDay(calendarDays[0])} - ${formatDay(calendarDays[calendarDays.length - 1])}`;
  }, [calendarDays]);

  const quickRanges = useMemo(() => {
    const today = startOfDay(DEFAULT_FROM);
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 6);
    const twoWeeksEnd = addDays(today, 13);

    return [
      { key: "today", label: "Сегодня", from: dayKey(today), to: dayKey(today) },
      { key: "tomorrow", label: "Завтра", from: dayKey(tomorrow), to: dayKey(tomorrow) },
      { key: "week", label: "7 дней", from: dayKey(today), to: dayKey(weekEnd) },
      { key: "two_weeks", label: "14 дней", from: dayKey(today), to: dayKey(twoWeeksEnd) }
    ];
  }, []);

  const roomSnapshots = useMemo(
    () =>
      rooms.map((room) => {
        const activeBookings = bookings.filter((entry) => entry.roomId === room.id);
        const occupiedDays = calendarDays.filter((date) =>
          activeBookings.some((entry) => isBookingVisibleInBoard(entry, dayKey(date)))
        ).length;
        const currentBooking =
          activeBookings.find((entry) => isBookingVisibleInBoard(entry, filters.from)) ??
          activeBookings[0] ??
          null;

        return {
          room,
          activeBookings,
          occupiedDays,
          occupancyPercent:
            calendarDays.length > 0 ? Math.round((occupiedDays / calendarDays.length) * 100) : 0,
          currentBooking
        };
      }),
    [bookings, calendarDays, filters.from, rooms]
  );

  const summary = useMemo(() => {
    const occupiedRooms = roomSnapshots.filter((snapshot) => snapshot.occupiedDays > 0).length;
    const arrivals = bookings.filter((booking) => booking.dates.checkIn === filters.from).length;
    const departures = bookings.filter((booking) => booking.dates.checkOut === filters.from).length;
    const stayingNow = bookings.filter((booking) => booking.status === "checked_in").length;

    return { occupiedRooms, arrivals, departures, stayingNow };
  }, [bookings, filters.from, roomSnapshots]);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [roomsResponse, bookingsResponse] = await Promise.all([
        listAzRoomsRequest(),
        listAzBookingsRequest(filters)
      ]);
      setRooms(roomsResponse);
      setBookings(bookingsResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить брони");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [filters.from, filters.to]);

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Бронирования</p>
        <h2>Шахматка и брони</h2>
        <p className="muted">
          На телефоне шахматка должна помогать действовать сразу: увидеть занятые номера, открыть нужную бронь, заселить или быстро поставить новый заезд.
        </p>
        <div className="status-actions booking-header-actions">
          <button className="primary-button" type="button" onClick={() => navigate("/shahmatka/bookings/new")}>
            Создать бронь
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setFilters({ from: DEFAULT_FROM, to: DEFAULT_TO })}
          >
            Показать рабочую неделю
          </button>
        </div>
      </section>

      <section className="panel booking-filters-panel">
        <div className="booking-quick-filters">
          {quickRanges.map((range) => {
            const isActive = filters.from === range.from && filters.to === range.to;

            return (
              <button
                className={isActive ? "secondary-button quick-chip active" : "secondary-button quick-chip"}
                key={range.key}
                type="button"
                onClick={() => setFilters({ from: range.from, to: range.to })}
              >
                {range.label}
              </button>
            );
          })}
        </div>
        <form className="form-grid az-inline-grid">
          <label>
            <span>С даты</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            />
          </label>
          <label>
            <span>По дату</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
        </form>
        <p className="muted booking-range-note">Сейчас на экране: {dateRangeLabel}</p>
      </section>

      {error ? (
        <section className="panel">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем шахматку...</p>
        </section>
      ) : null}

      {!isLoading && rooms.length === 0 ? (
        <section className="panel">
          <p className="muted">
            Сначала добавьте хотя бы один номер в разделе номерного фонда, и после этого можно будет заводить брони в шахматке.
          </p>
        </section>
      ) : null}

      {!isLoading && rooms.length > 0 ? (
        <section className="grid booking-summary-grid">
          <article className="card tone-success">
            <p className="card-title">Занятые номера</p>
            <strong className="card-value">{summary.occupiedRooms}</strong>
            <p className="card-detail">из {rooms.length} в текущем периоде</p>
          </article>
          <article className="card tone-info">
            <p className="card-title">Заезды</p>
            <strong className="card-value">{summary.arrivals}</strong>
            <p className="card-detail">на первый день периода</p>
          </article>
          <article className="card tone-warning">
            <p className="card-title">Выезды</p>
            <strong className="card-value">{summary.departures}</strong>
            <p className="card-detail">на первый день периода</p>
          </article>
          <article className="card">
            <p className="card-title">Проживают сейчас</p>
            <strong className="card-value">{summary.stayingNow}</strong>
            <p className="card-detail">их можно сразу открыть из списка броней</p>
          </article>
        </section>
      ) : null}

      {!isLoading && rooms.length > 0 ? (
        <>
          <section className="panel booking-mobile-board">
            <div className="booking-mobile-header">
              <div>
                <p className="eyebrow">Мобильная шахматка</p>
                <h3>Номера по карточкам</h3>
              </div>
              <span className="meta-pill">{dateRangeLabel}</span>
            </div>
            <div className="booking-mobile-list">
              {roomSnapshots.map(({ room, occupancyPercent, currentBooking }) => (
                <article className="booking-mobile-card" key={room.id}>
                  <div className="booking-mobile-card-header">
                    <div>
                      <strong>
                        № {room.number} · {azRoomTypeLabel(room.type)}
                      </strong>
                      <p className="muted">Загрузка: {occupancyPercent}% за выбранный период</p>
                    </div>
                    <span className={`status-badge status-${room.status}`}>{roomStatusLabel(room.status)}</span>
                  </div>

                  <div className="booking-mobile-strip" aria-label={`Занятость номера ${room.number}`}>
                    {calendarDays.map((date) => {
                      const key = dayKey(date);
                      const booking = bookings.find(
                        (entry) => entry.roomId === room.id && isBookingVisibleInBoard(entry, key)
                      );

                      return (
                        <div
                          className={
                            booking
                              ? `booking-mobile-day ${bookingToneClass(booking.status)}`
                              : "booking-mobile-day free"
                          }
                          key={`${room.id}_${key}`}
                        >
                          <span>{formatWeekday(date)}</span>
                          <strong>{date.getDate()}</strong>
                          <small>{booking ? booking.guestName.split(" ")[0] : "Своб."}</small>
                        </div>
                      );
                    })}
                  </div>

                  {currentBooking ? (
                    <div className="booking-mobile-guest">
                      <strong>{currentBooking.guestName}</strong>
                      <p className="muted">
                        {formatRange(currentBooking.dates.checkIn, currentBooking.dates.checkOut)} ·{" "}
                        {azBookingStatusLabel(currentBooking.status)}
                      </p>
                    </div>
                  ) : (
                    <p className="muted">В выбранном диапазоне номер свободен.</p>
                  )}

                  <div className="status-actions">
                    {currentBooking ? (
                      <Link className="secondary-link" to={`/shahmatka/bookings/${currentBooking.id}/edit`}>
                        Открыть бронь
                      </Link>
                    ) : (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => navigate(`/shahmatka/bookings/new?roomId=${room.id}`)}
                      >
                        Забронировать этот номер
                      </button>
                    )}
                    {azhotelFrontdeskEnabled && currentBooking?.status === "checked_in" ? (
                      <Link className="secondary-link" to={`/shahmatka/check-out?bookingId=${currentBooking.id}`}>
                        Выселить
                      </Link>
                    ) : null}
                    {azhotelFrontdeskEnabled &&
                    currentBooking &&
                    (currentBooking.status === "draft" || currentBooking.status === "confirmed") ? (
                      <Link className="secondary-link" to={`/shahmatka/check-in?bookingId=${currentBooking.id}`}>
                        Заселить
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel booking-desktop-board">
            <div className="booking-mobile-header">
              <div>
                <p className="eyebrow">Полная сетка</p>
                <h3>Шахматка для планшета и широкого экрана</h3>
              </div>
            </div>
            <div className="booking-board az-calendar">
              <div className="booking-board-header az-calendar-header">
                <div className="booking-board-corner">Номер</div>
                {calendarDays.map((date) => (
                  <div className="booking-board-day" key={date.toISOString()}>
                    {formatDay(date)}
                  </div>
                ))}
              </div>
              {rooms.map((room) => (
                <div className="booking-board-row az-calendar-row" key={room.id}>
                  <div className="booking-board-room">
                    {room.number} · {azRoomTypeLabel(room.type)}
                  </div>
                  {calendarDays.map((date) => {
                    const key = dayKey(date);
                    const booking = bookings.find(
                      (entry) => entry.roomId === room.id && isBookingVisibleInBoard(entry, key)
                    );

                    return (
                      <div
                        className={
                          booking
                            ? `booking-board-cell az-booking-cell ${bookingToneClass(booking.status)}`
                            : "booking-board-cell az-booking-cell free"
                        }
                        key={`${room.id}_desktop_${key}`}
                      >
                        {booking ? booking.guestName.split(" ")[0] : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="az-calendar-legend">
              <span><i className="legend-box booked" /> Занято</span>
              <span><i className="legend-box free" /> Свободно</span>
              <span><i className="legend-box pending" /> Черновик</span>
            </div>
          </section>
        </>
      ) : null}

      <section className="screen reservation-list">
        {bookings.map((booking) => (
          <article className="panel" key={booking.id}>
            <p className="eyebrow">
              Номер {booking.roomNumber} · {azChannelLabel(booking.channel)}
            </p>
            <h3>{booking.guestName}</h3>
            <p className="muted">
              {booking.dates.checkIn} - {booking.dates.checkOut} · {azBookingStatusLabel(booking.status)}
            </p>
            <p className="muted">Сумма: {booking.total}</p>
            <div className="status-actions">
              <Link className="secondary-link" to={`/shahmatka/bookings/${booking.id}/edit`}>
                Открыть форму
              </Link>
              {azhotelFrontdeskEnabled && (booking.status === "draft" || booking.status === "confirmed") ? (
                <Link className="secondary-link" to={`/shahmatka/check-in?bookingId=${booking.id}`}>
                  Заселить
                </Link>
              ) : null}
              {azhotelFrontdeskEnabled && booking.status === "checked_in" ? (
                <Link className="secondary-link" to={`/shahmatka/check-out?bookingId=${booking.id}`}>
                  Выселить
                </Link>
              ) : null}
            </div>
          </article>
        ))}
        {!isLoading && bookings.length === 0 ? (
          <article className="panel">
            <p className="muted">В выбранном диапазоне броней пока нет.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}

