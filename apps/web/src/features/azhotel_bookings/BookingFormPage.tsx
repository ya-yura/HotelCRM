import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type {
  AzBookingCreate,
  AzBookingStatus,
  AzBookingView,
  AzRoom
} from "@hotel-crm/shared/features/azhotel_core";
import {
  createAzBookingRequest,
  listAzRoomsRequest,
  loadAzBookingRequest,
  updateAzBookingRequest
} from "../../lib/api";
import { deriveOnboardingState, withGuideMode } from "../../lib/onboarding";
import { useAuth } from "../../state/authStore";
import { useHotelStore } from "../../state/hotelStore";
import { azRoomTypeLabel } from "../azhotel_rooms/roomLabels";
import { azBookingStatusLabel, createDefaultBookingForm } from "./bookingLabels";

export function BookingFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { session, users } = useAuth();
  const { rooms: storeRooms, reservations, stays, payments } = useHotelStore();
  const isEdit = Boolean(id);
  const [rooms, setRooms] = useState<AzRoom[]>([]);
  const [currentBooking, setCurrentBooking] = useState<AzBookingView | null>(null);
  const [form, setForm] = useState<AzBookingCreate>(createDefaultBookingForm());
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms: storeRooms,
    reservations,
    stays,
    payments
  });
  const isGuideMode = searchParams.get("guide") === "1";
  const requestedRoomId = searchParams.get("roomId");
  const onboardingNotice =
    typeof location.state === "object" && location.state && "onboardingNotice" in location.state
      ? String((location.state as { onboardingNotice?: string }).onboardingNotice ?? "")
      : "";

  useEffect(() => {
    setIsLoading(true);
    setError("");
    void Promise.all([
      listAzRoomsRequest(),
      id ? loadAzBookingRequest(id) : Promise.resolve(null)
    ])
      .then(([roomsResponse, bookingResponse]) => {
        setRooms(roomsResponse);
        if (bookingResponse) {
          setCurrentBooking(bookingResponse);
          setForm({
            guestName: bookingResponse.guestName,
            guestPhone: "",
            guestEmail: "",
            roomId: bookingResponse.roomId,
            dates: bookingResponse.dates,
            status: bookingResponse.status,
            services: bookingResponse.services,
            total: bookingResponse.total,
            channel: bookingResponse.channel
          });
        } else if (roomsResponse.length > 0) {
          const defaultRoomId = requestedRoomId && roomsResponse.some((room) => room.id === requestedRoomId)
            ? requestedRoomId
            : roomsResponse[0].id;
          setForm(createDefaultBookingForm(defaultRoomId));
        }
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить форму брони")
      )
      .finally(() => setIsLoading(false));
  }, [id, requestedRoomId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      if (id) {
        await updateAzBookingRequest(id, form);
      } else {
        await createAzBookingRequest(form);
      }
      if (!id && isGuideMode && onboarding.isOwner) {
        navigate(withGuideMode("/shahmatka/today"), {
          state: { onboardingNotice: "Первая бронь создана. Теперь пройдите первый рабочий цикл по отелю." }
        });
        return;
      }
      navigate(isGuideMode ? withGuideMode("/shahmatka/bookings") : "/shahmatka/bookings");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить бронь");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Бронирования</p>
        <h2>{isEdit ? "Редактирование брони" : "Новая бронь"}</h2>
        <p className="muted">
          Форма работает в контуре Шахматки и использует номера из отдельного номерного фонда.
        </p>
        {onboarding.isOwner && (isGuideMode || onboarding.nextStep?.id === "booking") && !isEdit ? (
          <div className="panel inset-panel guide-panel">
            <p className="eyebrow">Шаг 3 из 4</p>
            <h3>Создайте первую реальную бронь</h3>
            <p className="muted">
              Здесь лучше не усложнять: один гость, один номер, понятные даты и базовая сумма. Этого достаточно, чтобы дальше проверить заезд и выезд.
            </p>
          </div>
        ) : null}
        {onboardingNotice ? <p className="muted">{onboardingNotice}</p> : null}
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем форму...</p>
        </section>
      ) : (
        <section className="panel">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Гость</span>
              <input
                value={form.guestName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, guestName: event.target.value }))
                }
                placeholder="Иван Петров"
              />
            </label>
            <label>
              <span>Телефон</span>
              <input
                value={form.guestPhone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, guestPhone: event.target.value }))
                }
                placeholder="+79990000000"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                value={form.guestEmail}
                onChange={(event) =>
                  setForm((current) => ({ ...current, guestEmail: event.target.value }))
                }
                placeholder="guest@example.com"
              />
            </label>
            <label>
              <span>Номер</span>
              <select
                value={form.roomId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, roomId: event.target.value }))
                }
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.number} • {azRoomTypeLabel(room.type)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Заезд</span>
              <input
                type="date"
                value={form.dates.checkIn}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dates: { ...current.dates, checkIn: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              <span>Выезд</span>
              <input
                type="date"
                value={form.dates.checkOut}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dates: { ...current.dates, checkOut: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              <span>Статус</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as AzBookingStatus
                  }))
                }
              >
                <option value="draft">{azBookingStatusLabel("draft")}</option>
                <option value="confirmed">{azBookingStatusLabel("confirmed")}</option>
                <option value="checked_in">{azBookingStatusLabel("checked_in")}</option>
                <option value="checked_out">{azBookingStatusLabel("checked_out")}</option>
                <option value="cancelled">{azBookingStatusLabel("cancelled")}</option>
                <option value="no_show">{azBookingStatusLabel("no_show")}</option>
              </select>
            </label>
            <label>
              <span>Канал</span>
              <input
                value={form.channel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, channel: event.target.value }))
                }
                placeholder="phone"
              />
            </label>
            <label>
              <span>Сумма</span>
              <input
                type="number"
                min="0"
                value={form.total}
                onChange={(event) =>
                  setForm((current) => ({ ...current, total: Number(event.target.value) }))
                }
              />
            </label>
            {currentBooking?.services.length ? (
              <div className="panel inset-panel">
                <p className="eyebrow">Услуги</p>
                {currentBooking.services.map((service) => (
                  <p className="muted" key={service.id}>
                    {service.name} • {service.quantity} • {service.total}
                  </p>
                ))}
              </div>
            ) : null}
            {error ? <p className="error-text">{error}</p> : null}
            <div className="status-actions">
              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Сохраняем..." : "Сохранить бронь"}
              </button>
              <Link className="secondary-link" to={isGuideMode ? withGuideMode("/shahmatka/bookings") : "/shahmatka/bookings"}>
                Назад к календарю
              </Link>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

