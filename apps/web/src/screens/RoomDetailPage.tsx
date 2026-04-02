import { useParams } from "react-router-dom";
import { useHotelStore } from "../state/hotelStore";
import { roomStatusLabel, roomTypeLabel } from "../lib/ru";

export function RoomDetailPage() {
  const { id } = useParams();
  const { rooms } = useHotelStore();
  const room = rooms.find((entry) => entry.id === id);

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Карточка номера</p>
        <h2>{room ? `Номер ${room.number}` : "Номер не найден"}</h2>
        <p className="muted">
          {room ? `${roomTypeLabel(room.roomType)} • ${roomStatusLabel(room.status)}` : "Здесь будет история номера и подробности по обслуживанию."}
        </p>
      </section>
    </div>
  );
}
