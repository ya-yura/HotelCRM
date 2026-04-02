import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { OccupancyRecommendation } from "@hotel-crm/shared/ai";
import { loadOccupancyRecommendations } from "../lib/api";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { formatDateLabel, reservationStatusLabel, roomShortLabel } from "../lib/ru";

export function ReservationDetailPage() {
  const { id } = useParams();
  const {
    reservations,
    rooms,
    folios,
    stays,
    auditLogs,
    confirmReservation,
    checkInReservation,
    checkOutReservation,
    reassignReservationRoom
  } = useHotelStore();
  const [recommendations, setRecommendations] = useState<OccupancyRecommendation[]>([]);
  const { hasAnyRole } = useAuth();
  const canOperateReservation = hasAnyRole(["owner", "frontdesk"]);
  const reservation = reservations.find((entry) => entry.id === id);
  const folio = folios.find((entry) => entry.reservationId === id);
  const stay = stays.find((entry) => entry.reservationId === id && entry.status === "active");
  const history = auditLogs.filter((entry) => entry.entityId === id).slice(0, 5);

  useEffect(() => {
    if (!id || !reservation) {
      setRecommendations([]);
      return;
    }

    void loadOccupancyRecommendations(id)
      .then((items) => setRecommendations(items))
      .catch(() => setRecommendations([]));
  }, [id, reservation]);

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Карточка брони</p>
        <h2>{reservation?.guestName ?? "Бронь не найдена"}</h2>
        <p className="muted">
          {reservation
            ? `${formatDateLabel(reservation.checkInDate)} - ${formatDateLabel(reservation.checkOutDate)} • к оплате ${reservation.balanceDue} • ${roomShortLabel(reservation.roomLabel)}`
            : "Здесь выполняются подтверждение, заселение, выезд и назначение номера."}
        </p>
        {reservation ? (
          <div className="status-actions">
            {canOperateReservation && (reservation.status === "draft" || reservation.status === "pending_confirmation") ? (
              <button className="primary-button" onClick={() => confirmReservation(reservation.id)} type="button">
                Подтвердить бронь
              </button>
            ) : null}
            {canOperateReservation && reservation.status === "confirmed" ? (
              <button className="primary-button" onClick={() => checkInReservation(reservation.id)} type="button">
                Заселить
              </button>
            ) : null}
            {canOperateReservation && reservation.status === "checked_in" ? (
              <button className="primary-button" onClick={() => checkOutReservation(reservation.id)} type="button">
                Оформить выезд
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {reservation ? (
        <section className="panel">
          <p className="eyebrow">Назначение номера</p>
          <h3>Выберите номер или перенесите гостя</h3>
          {canOperateReservation && recommendations.length > 0 ? (
            <div className="screen compact-stack">
              {recommendations.map((item) => (
                <article className="panel inset-panel" key={item.roomId}>
                  <p className="eyebrow">
                    Подсказка ИИ {Math.round(item.score * 100)}% • номер {item.roomLabel}
                  </p>
                  <p className="muted">{item.explanation}</p>
                  <div className="status-actions">
                    <button
                      className="secondary-button"
                      onClick={() => reassignReservationRoom(reservation.id, item.roomId)}
                      type="button"
                    >
                      Назначить номер {item.roomLabel}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <div className="status-actions">
            {canOperateReservation
              ? rooms
              .filter((room) => ["available", "reserved", "inspected"].includes(room.status))
              .map((room) => (
                <button
                  key={room.id}
                  className="secondary-button"
                  onClick={() => reassignReservationRoom(reservation.id, room.id)}
                  type="button"
                >
                  Номер {room.number}
                </button>
              ))
              : null}
          </div>
        </section>
      ) : null}

      {reservation ? (
        <section className="panel">
          <p className="eyebrow">Проживание и расчёт</p>
          <p className="muted">Статус: {reservationStatusLabel(reservation.status)}</p>
          <p className="muted">Баланс folio: {folio?.balanceDue ?? reservation.balanceDue}</p>
          <p className="muted">Текущее проживание: {stay ? `Номер ${stay.roomLabel}` : "Нет активного проживания"}</p>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="screen">
          {history.map((entry) => (
            <article className="panel" key={entry.id}>
              <p className="eyebrow">{entry.action}</p>
              <p className="muted">{entry.reason}</p>
              <p className="muted">{entry.createdAt}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
