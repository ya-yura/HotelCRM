import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { AzRoom } from "@hotel-crm/shared/features/azhotel_core";
import { deleteAzRoomRequest, listAzRoomsRequest } from "../../lib/api";
import { deriveOnboardingState, withGuideMode } from "../../lib/onboarding";
import { useAuth } from "../../state/authStore";
import { useHotelStore } from "../../state/hotelStore";
import { azRoomStatusLabel, azRoomTypeLabel } from "./roomLabels";

export function RoomListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { session, users, hasAnyRole } = useAuth();
  const { reservations, stays, payments } = useHotelStore();
  const [rooms, setRooms] = useState<AzRoom[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const canManageRooms = hasAnyRole(["owner"]);
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms,
    reservations,
    stays,
    payments
  });
  const isGuideMode = searchParams.get("guide") === "1";
  const onboardingNotice =
    typeof location.state === "object" && location.state && "onboardingNotice" in location.state
      ? String((location.state as { onboardingNotice?: string }).onboardingNotice ?? "")
      : "";

  async function loadRooms() {
    setIsLoading(true);
    setError("");
    try {
      const items = await listAzRoomsRequest();
      setRooms(items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить номера");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRooms();
  }, []);

  async function handleDelete(roomId: string) {
    if (!canManageRooms) {
      return;
    }

    try {
      await deleteAzRoomRequest(roomId);
      await loadRooms();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить номер");
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Номера</p>
        <h2>Управление номерным фондом</h2>
        <p className="muted">
          Здесь можно завести тип и конкретный номер, задать статусы и правила цены, не меняя старые экраны основной системы.
        </p>
        {onboarding.isOwner && (isGuideMode || onboarding.nextStep?.id === "rooms") ? (
          <div className="panel inset-panel guide-panel">
            <p className="eyebrow">Шаг 1 из 4</p>
            <h3>Сначала заведите хотя бы один номер</h3>
            <p className="muted">
              Без номера нельзя нормально проверить бронь, заезд и выпуск комнаты после уборки.
            </p>
          </div>
        ) : null}
        {onboardingNotice ? <p className="muted">{onboardingNotice}</p> : null}
        {canManageRooms ? (
          <div className="status-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => navigate(isGuideMode ? withGuideMode("/shahmatka/rooms/new") : "/shahmatka/rooms/new")}
            >
              Добавить номер
            </button>
          </div>
        ) : null}
      </section>

      {error ? (
        <section className="panel">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем номера...</p>
        </section>
      ) : null}

      {!isLoading && rooms.length === 0 ? (
        <section className="panel">
          <p className="muted">Номеров Шахматки пока нет. Добавьте первый номер, чтобы начать настройку.</p>
        </section>
      ) : null}

      <section className="screen room-list">
        {rooms.map((room) => (
          <article className="panel" key={room.id}>
            <div className="room-header">
              <div>
                <p className="eyebrow">
                  Номер {room.number} • {azRoomTypeLabel(room.type)}
                </p>
                <h3>{azRoomStatusLabel(room.status)}</h3>
              </div>
            </div>
            <p className="muted">
              Правил цены: {room.priceRules.length}
            </p>
            {room.priceRules.map((rule) => (
              <p className="muted" key={rule.id}>
                {rule.title}: {rule.fixedPrice ?? `${rule.multiplier}x`}
              </p>
            ))}
            <div className="status-actions">
              <Link className="secondary-link" to={`/shahmatka/rooms/${room.id}/edit`}>
                Открыть форму
              </Link>
              {canManageRooms ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void handleDelete(room.id)}
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

