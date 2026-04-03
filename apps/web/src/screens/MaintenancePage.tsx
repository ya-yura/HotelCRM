import { useMemo, useState } from "react";
import type { MaintenanceEvidence } from "@hotel-crm/shared/maintenance";
import { captureImageFromDevice } from "../lib/deviceCapabilities";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { maintenancePriorityLabel, maintenanceStatusLabel } from "../lib/ru";

export function MaintenancePage() {
  const { hasAnyRole, session } = useAuth();
  const {
    rooms,
    maintenanceIncidents,
    createMaintenanceIncident,
    updateMaintenanceIncident,
    resolveMaintenanceIncident
  } = useHotelStore();
  const canOperate = hasAnyRole(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "critical">("normal");
  const [roomBlocked, setRoomBlocked] = useState(true);
  const [draftEvidence, setDraftEvidence] = useState<MaintenanceEvidence[]>([]);

  const selectedRoom = useMemo(
    () => rooms.find((entry) => entry.id === roomId) ?? rooms[0],
    [roomId, rooms]
  );
  const activeIncidents = maintenanceIncidents.filter(
    (entry) => entry.status === "open" || entry.status === "in_progress"
  );

  async function captureDraftEvidence() {
    const captured = await captureImageFromDevice();
    if (!captured) {
      return;
    }

    setDraftEvidence((current) => [
      {
        id: `maint_draft_${Date.now()}`,
        localUri: captured.localUri,
        uploadedUrl: "",
        caption: "Фото с устройства",
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
  }

  async function captureIncidentEvidence(incidentId: string) {
    const incident = maintenanceIncidents.find((entry) => entry.id === incidentId);
    if (!incident) {
      return;
    }

    const captured = await captureImageFromDevice();
    if (!captured) {
      return;
    }

    updateMaintenanceIncident(incidentId, {
      evidence: [
        {
          id: `maint_evidence_${Date.now()}`,
          localUri: captured.localUri,
          uploadedUrl: "",
          caption: "Фото с устройства",
          createdAt: new Date().toISOString()
        },
        ...incident.evidence
      ]
    });
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Техслужба</p>
        <h2>Поломки, блокировки и возврат номеров в продажу</h2>
        <p className="muted">
          Здесь отдельно ведутся дефекты и ремонт, чтобы уборка не смешивалась с техническими блокерами.
        </p>
      </section>

      <section className="grid">
        <article className="card tone-danger">
          <p className="card-title">Открытые заявки</p>
          <strong className="card-value">{activeIncidents.length}</strong>
          <p className="card-detail">Требуют реакции прямо сейчас</p>
        </article>
        <article className="card tone-warning">
          <p className="card-title">Блокируют продажи</p>
          <strong className="card-value">{activeIncidents.filter((entry) => entry.roomBlocked).length}</strong>
          <p className="card-detail">Номера нельзя назначать</p>
        </article>
        <article className="card tone-info">
          <p className="card-title">Критичные</p>
          <strong className="card-value">{activeIncidents.filter((entry) => entry.priority === "critical").length}</strong>
          <p className="card-detail">Нужен контроль управляющего</p>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Новая заявка</p>
        <h3>Завести дефект за 20 секунд</h3>
        <div className="status-actions">
          <select value={roomId} onChange={(event) => setRoomId(event.target.value)}>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.number} • {room.roomType}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
            <option value="normal">Обычный</option>
            <option value="high">Высокий</option>
            <option value="critical">Критичный</option>
            <option value="low">Низкий</option>
          </select>
        </div>
        <div className="status-actions">
          <input
            placeholder="Коротко: протечка, замок, обогреватель"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="status-actions">
          <textarea
            placeholder="Подробность или место дефекта"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </div>
        <label className="muted" style={{ display: "block", marginBottom: 12 }}>
          <input
            checked={roomBlocked}
            onChange={(event) => setRoomBlocked(event.target.checked)}
            type="checkbox"
          />{" "}
          Сразу блокировать номер от продажи
        </label>
        <div className="status-actions">
          <button
            className="secondary-button"
            disabled={!canOperate || !selectedRoom || title.trim().length < 2}
            onClick={() => {
              if (!selectedRoom || title.trim().length < 2) {
                return;
              }

              createMaintenanceIncident({
                roomId: selectedRoom.id,
                roomNumber: selectedRoom.number,
                title: title.trim(),
                description: description.trim(),
                priority,
                assignee: session?.role === "maintenance" ? session.userName : "",
                reportedBy: session?.userName ?? "",
                locationLabel: selectedRoom.zone || selectedRoom.floor || selectedRoom.roomType,
                impact: roomBlocked ? "block_from_sale" : "housekeeping_delay",
                roomBlocked,
                linkedHousekeepingTaskId: null,
                evidence: draftEvidence
              });
              setTitle("");
              setDescription("");
              setDraftEvidence([]);
            }}
            type="button"
          >
            Создать заявку
          </button>
          <button className="secondary-button" onClick={() => void captureDraftEvidence()} type="button">
            Добавить фото
          </button>
        </div>
        {draftEvidence.length > 0 ? (
          <div className="evidence-grid">
            {draftEvidence.map((evidence) => (
              <figure className="evidence-card" key={evidence.id}>
                <img alt={evidence.caption || "Черновик фото"} src={evidence.localUri || evidence.uploadedUrl} />
                <figcaption>{evidence.caption || "Фото проблемы"}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </section>

      <section className="screen housekeeping-list">
        {maintenanceIncidents.map((incident) => (
          <article className="panel" key={incident.id}>
            <div className="room-header">
              <div>
                <p className="eyebrow">
                  Номер {incident.roomNumber} • {maintenancePriorityLabel(incident.priority)}
                </p>
                <h3>{incident.title}</h3>
              </div>
              <span className={incident.roomBlocked ? "status-badge status-blocked_maintenance" : "status-badge status-inspected"}>
                {maintenanceStatusLabel(incident.status)}
              </span>
            </div>

            <p className="muted">{incident.description || "Описание не добавлено."}</p>
            <p className="muted">
              Ответственный: {incident.assignee || "не назначен"} • Сообщил: {incident.reportedBy || "сотрудник"}
            </p>
            <p className="muted">
              Локация: {incident.locationLabel || "не указана"} • Блок продажи: {incident.roomBlocked ? "да" : "нет"}
            </p>
            {incident.resolutionNote ? <p className="muted">Решение: {incident.resolutionNote}</p> : null}
            {incident.evidence.length > 0 ? (
              <div className="evidence-grid">
                {incident.evidence.map((evidence) => (
                  <figure className="evidence-card" key={evidence.id}>
                    <img alt={evidence.caption || "Фото инцидента"} src={evidence.localUri || evidence.uploadedUrl} />
                    <figcaption>{evidence.caption || "Фото инцидента"}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}

            <div className="status-actions">
              {canOperate ? (
                <button
                  className="secondary-button"
                  onClick={() => void captureIncidentEvidence(incident.id)}
                  type="button"
                >
                  Добавить фото
                </button>
              ) : null}
              {canOperate && incident.status === "open" ? (
                <button
                  className="secondary-button"
                  onClick={() => updateMaintenanceIncident(incident.id, { status: "in_progress" })}
                  type="button"
                >
                  Взять в работу
                </button>
              ) : null}
              {canOperate && incident.status !== "resolved" && incident.status !== "cancelled" ? (
                <button
                  className="secondary-button"
                  onClick={() => resolveMaintenanceIncident(incident.id, "Исправлено и готово к проверке")}
                  type="button"
                >
                  Решено
                </button>
              ) : null}
              {canOperate && incident.status !== "cancelled" && incident.status !== "resolved" ? (
                <button
                  className="secondary-button"
                  onClick={() => updateMaintenanceIncident(incident.id, { status: "cancelled", roomBlocked: false })}
                  type="button"
                >
                  Закрыть без ремонта
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
