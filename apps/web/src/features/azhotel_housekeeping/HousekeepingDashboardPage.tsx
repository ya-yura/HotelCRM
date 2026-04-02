import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AzHousekeepingDashboard, AzHousekeepingTaskView } from "@hotel-crm/shared/features/azhotel_core";
import {
  listAzHousekeepingTasksRequest,
  loadAzHousekeepingDashboardRequest
} from "../../lib/api";
import { azHousekeepingStatusLabel } from "./housekeepingLabels";

export function HousekeepingDashboardPage() {
  const [dashboard, setDashboard] = useState<AzHousekeepingDashboard | null>(null);
  const [tasks, setTasks] = useState<AzHousekeepingTaskView[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setError("");
    void Promise.all([loadAzHousekeepingDashboardRequest(), listAzHousekeepingTasksRequest()])
      .then(([dashboardData, taskItems]) => {
        setDashboard(dashboardData);
        setTasks(taskItems.slice(0, 5));
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить панель уборки")
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Уборка</p>
        <h2>Операционная уборка</h2>
        <p className="muted">Короткая сводка по грязным номерам, очереди задач и текущей загрузке уборки.</p>
        <div className="status-actions">
          <Link className="secondary-link" to="/shahmatka/housekeeping/tasks">
            Открыть список задач
          </Link>
        </div>
      </section>

      {error ? (
        <section className="panel">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем сводку...</p>
        </section>
      ) : null}

      {dashboard ? (
        <>
          <section className="grid">
            <article className="card tone-warning">
              <p className="card-title">Всего задач</p>
              <strong className="card-value">{dashboard.totalTasks}</strong>
            </article>
            <article className="card tone-danger">
              <p className="card-title">Грязных номеров</p>
              <strong className="card-value">{dashboard.dirtyRooms}</strong>
            </article>
            <article className="card tone-info">
              <p className="card-title">В работе</p>
              <strong className="card-value">{dashboard.inProgressTasks}</strong>
            </article>
            <article className="card tone-success">
              <p className="card-title">Без назначений</p>
              <strong className="card-value">{dashboard.unassignedTasks}</strong>
            </article>
          </section>

          <section className="panel">
            <p className="eyebrow">Ближайшие задачи</p>
            <div className="screen compact-stack">
              {tasks.length === 0 ? (
                <p className="muted">Сейчас задач нет, все номера в порядке.</p>
              ) : null}
              {tasks.map((task) => (
                <div className="panel inset-panel" key={task.id}>
                  <p className="eyebrow">
                    Номер {task.roomNumber} • {task.roomType}
                  </p>
                  <h3>{azHousekeepingStatusLabel(task.status)}</h3>
                  <p className="muted">
                    {task.assignee ? `Исполнитель: ${task.assignee}` : "Ещё не назначено"}
                  </p>
                  {task.guestName ? (
                    <p className="muted">Связано с бронью: {task.guestName}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

