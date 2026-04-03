import { useState } from "react";
import type {
  HousekeepingTaskStatus,
} from "@hotel-crm/shared/housekeeping";
import { captureImageFromDevice } from "../lib/deviceCapabilities";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { housekeepingStatusLabel } from "../lib/ru";

const transitions: Record<HousekeepingTaskStatus, HousekeepingTaskStatus[]> = {
  queued: ["in_progress", "paused", "problem_reported", "cancelled"],
  in_progress: ["inspection_requested", "completed", "problem_reported", "paused"],
  paused: ["in_progress", "problem_reported", "cancelled"],
  inspection_requested: ["completed", "problem_reported"],
  problem_reported: ["paused", "cancelled"],
  completed: [],
  cancelled: ["queued"]
};

export function HousekeepingPage() {
  const { hasAnyRole, session } = useAuth();
  const { housekeepingTasks: tasks, createMaintenanceIncident, updateHousekeepingTask } = useHotelStore();
  const canOperateHousekeeping = hasAnyRole(["owner", "manager", "frontdesk", "housekeeping", "maintenance"]);
  const [problemDrafts, setProblemDrafts] = useState<Record<string, string>>({});

  async function handleCaptureEvidence(taskId: string) {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) {
      return;
    }

    const captured = await captureImageFromDevice();
    if (!captured) {
      return;
    }

    updateHousekeepingTask(taskId, {
      evidence: [
        {
          id: `hk_evidence_${Date.now()}`,
          localUri: captured.localUri,
          uploadedUrl: "",
          caption: "Фото с устройства",
          createdAt: new Date().toISOString()
        },
        ...task.evidence
      ]
    });
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Уборка</p>
        <h2>Очередь уборки и подготовки номеров</h2>
        <p className="muted">
          Уборка ведётся через явные задачи, чтобы готовность номера не зависела от устных договорённостей.
        </p>
      </section>

      <section className="grid">
        <article className="card tone-danger">
          <p className="card-title">Срочные задачи</p>
          <strong className="card-value">
            {tasks.filter((task) => task.priority === "urgent" && task.status !== "completed").length}
          </strong>
          <p className="card-detail">Нужно сделать до заездов</p>
        </article>
        <article className="card tone-info">
          <p className="card-title">В работе</p>
          <strong className="card-value">
            {tasks.filter((task) => task.status === "in_progress").length}
          </strong>
          <p className="card-detail">Уборка и проверка прямо сейчас</p>
        </article>
      </section>

      <section className="screen housekeeping-list">
        {tasks.map((task) => (
          <article className="panel" key={task.id}>
            <div className="room-header">
              <div>
                <p className="eyebrow">
                  Номер {task.roomNumber} • {task.taskType.replaceAll("_", " ")}
                </p>
                <h3>{housekeepingStatusLabel(task.status)}</h3>
              </div>
              <span
                className={
                  task.priority === "urgent" || task.status === "problem_reported"
                    ? "status-badge status-dirty"
                    : task.status === "inspection_requested"
                      ? "status-badge status-inspected"
                      : "status-badge status-available"
                }
              >
                {task.dueLabel}
              </span>
            </div>

            <p className="muted">{task.note}</p>
            <p className="muted">
              Исполнитель: {task.assigneeName || "не назначен"} • Смена: {task.shiftLabel || "без смены"}
            </p>
            {task.checklist.length > 0 ? (
              <p className="muted">
                Чек-лист: {task.checklist.map((item) => `${item.done ? "✓" : "○"} ${item.label}`).join(" • ")}
              </p>
            ) : null}
            {task.consumables.length > 0 ? (
              <p className="muted">
                Расходники: {task.consumables.map((item) => `${item.item} x${item.quantity}`).join(", ")}
              </p>
            ) : null}
            {task.problemNote ? <p className="muted">Проблема: {task.problemNote}</p> : null}
            {task.evidence.length > 0 ? (
              <div className="evidence-grid">
                {task.evidence.map((evidence) => (
                  <figure className="evidence-card" key={evidence.id}>
                    <img alt={evidence.caption || "Фото задачи"} src={evidence.localUri || evidence.uploadedUrl} />
                    <figcaption>{evidence.caption || "Фото задачи"}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}

            <div className="status-actions">
              {canOperateHousekeeping ? transitions[task.status].map((nextStatus) => (
                <button
                  key={nextStatus}
                  className="secondary-button"
                  onClick={() => updateHousekeepingTask(task.id, nextStatus)}
                  type="button"
                >
                  {housekeepingStatusLabel(nextStatus)}
                </button>
              )) : null}
              {canOperateHousekeeping ? (
                <button
                  className="secondary-button"
                  onClick={() => void handleCaptureEvidence(task.id)}
                  type="button"
                >
                  Добавить фото
                </button>
              ) : null}
            </div>

            <div className="status-actions">
              <input
                placeholder="Поломка или заметка для техслужбы"
                value={problemDrafts[task.id] ?? ""}
                onChange={(event) =>
                  setProblemDrafts((current) => ({ ...current, [task.id]: event.target.value }))
                }
              />
              <button
                className="secondary-button"
                disabled={!canOperateHousekeeping || (problemDrafts[task.id] ?? "").trim().length < 3}
                onClick={() => {
                  const description = (problemDrafts[task.id] ?? "").trim();
                  if (description.length < 3) {
                    return;
                  }

                  updateHousekeepingTask(task.id, {
                    status: "problem_reported",
                    problemNote: description
                  });
                  createMaintenanceIncident({
                    roomId: task.roomId,
                    roomNumber: task.roomNumber,
                    title: description,
                    description,
                    priority: task.priority === "urgent" ? "high" : "normal",
                    assignee: "",
                    reportedBy: session?.userName ?? "",
                    locationLabel: task.roomNumber,
                    impact: "block_from_sale",
                    roomBlocked: true,
                    linkedHousekeepingTaskId: task.id,
                    evidence: []
                  });
                  setProblemDrafts((current) => ({ ...current, [task.id]: "" }));
                }}
                type="button"
              >
                Передать в техслужбу
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
