import { useEffect, useMemo, useState } from "react";
import type { AuthUserSummary } from "@hotel-crm/shared/auth";
import type { AzHousekeepingTaskView } from "@hotel-crm/shared/features/azhotel_core";
import {
  listAuthUsersRequest,
  listAzHousekeepingTasksRequest,
  updateAzHousekeepingTaskRequest
} from "../../lib/api";
import { useAuth } from "../../state/authStore";
import { azHousekeepingStatusLabel, azRoomStatusTone } from "./housekeepingLabels";

export function TaskListPage() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<AzHousekeepingTaskView[]>([]);
  const [staff, setStaff] = useState<AuthUserSummary[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "queued" | "in_progress" | "done">("all");

  const visibleTasks = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((task) => task.status === filter)),
    [filter, tasks]
  );

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [taskItems, usersResult] = await Promise.allSettled([
        listAzHousekeepingTasksRequest(),
        listAuthUsersRequest()
      ]);
      if (taskItems.status !== "fulfilled") {
        throw taskItems.reason;
      }

      setTasks(taskItems.value);
      setStaff(
        usersResult.status === "fulfilled"
          ? usersResult.value.filter((user) => user.role === "housekeeping")
          : []
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить задачи уборки");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function patchTask(taskId: string, patch: { status?: AzHousekeepingTaskView["status"]; assignee?: string | undefined }) {
    try {
      const next = await updateAzHousekeepingTaskRequest(taskId, patch);
      setTasks((current) => current.map((task) => (task.id === taskId ? next : task)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить задачу");
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Уборка</p>
        <h2>Список задач уборки</h2>
        <p className="muted">Здесь видно, какие номера грязные, кто назначен и какие комнаты уже готовы к следующему гостю.</p>
        <div className="status-actions">
          <button className="secondary-button" type="button" onClick={() => setFilter("all")}>Все</button>
          <button className="secondary-button" type="button" onClick={() => setFilter("queued")}>В очереди</button>
          <button className="secondary-button" type="button" onClick={() => setFilter("in_progress")}>В работе</button>
          <button className="secondary-button" type="button" onClick={() => setFilter("done")}>Готово</button>
        </div>
      </section>

      {error ? (
        <section className="panel">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем задачи...</p>
        </section>
      ) : null}

      {!isLoading && visibleTasks.length === 0 ? (
        <section className="panel">
          <p className="muted">По текущему фильтру задач нет.</p>
        </section>
      ) : null}

      <section className="screen">
        {visibleTasks.map((task) => (
          <article className="panel" key={task.id}>
            <p className="eyebrow">
              Номер {task.roomNumber} • {task.roomType}
            </p>
            <h3>{azHousekeepingStatusLabel(task.status)}</h3>
            <p className="muted">
              Статус номера: <span className={`status-badge ${azRoomStatusTone(task.roomStatus)}`}>{task.roomStatus}</span>
            </p>
            {task.guestName ? (
              <p className="muted">
                Связано с бронью: {task.guestName}
              </p>
            ) : null}

            <label>
              <span>Назначить сотруднику</span>
              <select
                value={task.assignee}
                onChange={(event) => void patchTask(task.id, { assignee: event.target.value })}
              >
                <option value="">Не назначено</option>
                {staff.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="status-actions">
              {session?.role === "housekeeping" ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void patchTask(task.id, { assignee: session.userName })}
                >
                  Назначить на меня
                </button>
              ) : null}
              <button
                className="secondary-button"
                type="button"
                onClick={() => void patchTask(task.id, { status: "queued" })}
              >
                В очередь
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void patchTask(task.id, { status: "in_progress" })}
              >
                В работу
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void patchTask(task.id, { status: "done" })}
              >
                Отметить чистым
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

