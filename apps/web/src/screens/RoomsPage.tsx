import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { roomStatusLabel, roomTypeLabel } from "../lib/ru";

export function RoomsPage() {
  const { hasAnyRole } = useAuth();
  const { rooms, updateRoomStatus, getAllowedRoomTransitions } = useHotelStore();
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
                  Номер {room.number} • {roomTypeLabel(room.roomType)}
                </p>
                <h3>{roomStatusLabel(room.status)}</h3>
              </div>
              <span className={`status-badge status-${room.status}`}>{room.occupancyLabel}</span>
            </div>

            <p className="muted">{room.housekeepingNote}</p>
            <p className="muted">{room.nextAction}</p>

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
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
