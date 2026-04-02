import type {
  HousekeepingTaskStatus,
} from "@hotel-crm/shared/housekeeping";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { housekeepingStatusLabel } from "../lib/ru";

const transitions: Record<HousekeepingTaskStatus, HousekeepingTaskStatus[]> = {
  queued: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["queued"]
};

export function HousekeepingPage() {
  const { hasAnyRole } = useAuth();
  const { housekeepingTasks: tasks, updateHousekeepingTask } = useHotelStore();
  const canOperateHousekeeping = hasAnyRole(["owner", "frontdesk", "housekeeping"]);

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
                  task.priority === "urgent" ? "status-badge status-dirty" : "status-badge status-inspected"
                }
              >
                {task.dueLabel}
              </span>
            </div>

            <p className="muted">{task.note}</p>

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
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
