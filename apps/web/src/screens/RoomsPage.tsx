import { Link } from "react-router-dom";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { roomStatusLabel, roomTypeLabel } from "../lib/ru";

export function RoomsPage() {
  const { hasAnyRole } = useAuth();
  const { rooms, maintenanceIncidents, updateRoomStatus, getAllowedRoomTransitions } = useHotelStore();
  const canOperateRooms = hasAnyRole(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]);

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Номера</p>
        <h2>Состояние номеров и готовность к заезду</h2>
        <p className="muted">
          Состояние номера фиксируется явно. Это основа безопасного назначения и заселения.
        </p>
      </section>

      <section className="grid">
        <article className="card tone-success">
          <p className="card-title">Готовы сейчас</p>
          <strong className="card-value">
            {rooms.filter((room) => room.status === "available").length}
          </strong>
          <p className="card-detail">Можно назначать</p>
        </article>
        <article className="card tone-danger">
          <p className="card-title">Грязные или на уборке</p>
          <strong className="card-value">
            {rooms.filter((room) => room.status === "dirty" || room.status === "cleaning").length}
          </strong>
          <p className="card-detail">Риск для ближайших заездов</p>
        </article>
        <article className="card tone-warning">
          <p className="card-title">Риск по заездам</p>
          <strong className="card-value">
            {rooms.filter((room) => room.priority === "arrival_soon").length}
          </strong>
          <p className="card-detail">Нужно вмешаться до прихода гостя</p>
        </article>
        <article className="card tone-info">
          <p className="card-title">Блоки по ремонту</p>
          <strong className="card-value">
            {rooms.filter((room) => room.status === "blocked_maintenance").length}
          </strong>
          <p className="card-detail">Номер не продаётся</p>
        </article>
      </section>

      <section className="screen room-list">
        {rooms.map((room) => (
          <article className="panel" key={room.id}>
            <div className="room-header">
              <div>
                <p className="eyebrow">
                  Номер {room.number} • {roomTypeLabel(room.roomType)} • {room.zone || room.floor || "без зоны"}
                </p>
                <h3>{roomStatusLabel(room.status)}</h3>
              </div>
              <span className={`status-badge status-${room.status}`}>{room.readinessLabel}</span>
            </div>

            <p className="muted">{room.housekeepingNote}</p>
            <p className="muted">{room.nextAction}</p>
            <p className="muted">
              Вместимость: {room.occupancyLimit} • Удобства: {room.amenities.length > 0 ? room.amenities.join(", ") : "не заданы"}
            </p>
            {room.nextArrivalLabel ? <p className="muted">Ближайший заезд: {room.nextArrivalLabel}</p> : null}
            {room.outOfOrderReason ? <p className="muted">Причина блока: {room.outOfOrderReason}</p> : null}
            {room.glampingMetadata ? (
              <p className="muted">
                Глэмпинг: {room.glampingMetadata.unitType || "юнит"} • {room.glampingMetadata.outdoorAreaLabel || "наружная зона не указана"}
              </p>
            ) : null}
            {room.activeMaintenanceIncidentId ? (
              <p className="muted">
                Активная техзаявка:{" "}
                {maintenanceIncidents.find((entry) => entry.id === room.activeMaintenanceIncidentId)?.title || "есть активная заявка"}.
                {" "}
                <Link to="/maintenance">Открыть техслужбу</Link>
              </p>
            ) : null}

            <div className="status-actions">
              {canOperateRooms ? getAllowedRoomTransitions(room).map((nextStatus) => (
                <button
                  key={nextStatus}
                  className="secondary-button"
                  onClick={() => updateRoomStatus(room.id, nextStatus)}
                  type="button"
                >
                  {roomStatusLabel(nextStatus)}
                </button>
              )) : null}
              <Link className="secondary-link" to="/maintenance">
                Техслужба
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
