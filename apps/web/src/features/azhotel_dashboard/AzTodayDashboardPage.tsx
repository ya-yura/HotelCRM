import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AzTodayDashboard } from "@hotel-crm/shared/features/azhotel_core";
import { loadAzTodayDashboardRequest } from "../../lib/api";
import { azBookingStatusLabel } from "../azhotel_bookings/bookingLabels";
import { azHousekeepingStatusLabel } from "../azhotel_housekeeping/housekeepingLabels";

export function AzTodayDashboardPage() {
  const [dashboard, setDashboard] = useState<AzTodayDashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setError("");
    void loadAzTodayDashboardRequest()
      .then(setDashboard)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить обзор дня Шахматки")
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="screen">
      <section className="hero-panel">
        <p className="eyebrow">Шахматка · Обзор дня</p>
        <h2>Всё, что важно по сегодняшней смене.</h2>
        <p className="muted">
          Заезды, выезды, загрузка, готовые номера и задачи уборки собраны в одном месте.
        </p>
        <div className="status-actions">
          <Link className="secondary-link" to="/shahmatka/bookings">
            Открыть шахматку
          </Link>
          <Link className="secondary-link" to="/shahmatka/housekeeping/tasks">
            Открыть уборку
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
          <p className="muted">Загружаем обзор дня...</p>
        </section>
      ) : null}

      {dashboard ? (
        <>
          <section className="grid">
            <article className="card tone-info">
              <p className="card-title">Заезды сегодня</p>
              <strong className="card-value">{dashboard.arrivalsCount}</strong>
            </article>
            <article className="card tone-warning">
              <p className="card-title">Выезды сегодня</p>
              <strong className="card-value">{dashboard.departuresCount}</strong>
            </article>
            <article className="card tone-success">
              <p className="card-title">Загрузка</p>
              <strong className="card-value">{dashboard.occupancyRate}%</strong>
            </article>
            <article className="card tone-danger">
              <p className="card-title">
                {dashboard.scope === "staff" ? "Мои задачи" : "Грязные номера"}
              </p>
              <strong className="card-value">
                {dashboard.scope === "staff" ? dashboard.myTasksCount : dashboard.dirtyRooms}
              </strong>
            </article>
          </section>

          <section className="panel">
            <p className="eyebrow">Быстрая картина</p>
            <div className="stats-strip">
              <div>
                <p className="muted">Заселено</p>
                <strong>{dashboard.occupiedRooms}</strong>
              </div>
              <div>
                <p className="muted">Готово к продаже</p>
                <strong>{dashboard.readyRooms}</strong>
              </div>
              <div>
                <p className="muted">Уборка в работе</p>
                <strong>{dashboard.tasksInProgress}</strong>
              </div>
            </div>
          </section>

          <section className="screen compact-stack">
            <section className="panel">
              <p className="eyebrow">Заезды</p>
              {dashboard.arrivals.length === 0 ? (
                <p className="muted">Сегодня новых заездов пока нет.</p>
              ) : null}
              {dashboard.arrivals.map((item) => (
                <div className="panel inset-panel" key={item.id}>
                  <h3>{item.guestName}</h3>
                  <p className="muted">
                    Номер {item.roomNumber} • {azBookingStatusLabel(item.status)}
                  </p>
                </div>
              ))}
            </section>

            <section className="panel">
              <p className="eyebrow">Выезды</p>
              {dashboard.departures.length === 0 ? (
                <p className="muted">Сегодня выездов пока нет.</p>
              ) : null}
              {dashboard.departures.map((item) => (
                <div className="panel inset-panel" key={item.id}>
                  <h3>{item.guestName}</h3>
                  <p className="muted">
                    Номер {item.roomNumber} • {azBookingStatusLabel(item.status)}
                  </p>
                </div>
              ))}
            </section>

            <section className="panel">
              <p className="eyebrow">
                {dashboard.scope === "staff" ? "Мои задачи" : "Уборка и готовность"}
              </p>
              {dashboard.housekeepingTasks.length === 0 ? (
                <p className="muted">По уборке сейчас всё спокойно.</p>
              ) : null}
              {dashboard.housekeepingTasks.map((task) => (
                <div className="panel inset-panel" key={task.id}>
                  <h3>
                    Номер {task.roomNumber} • {task.roomType}
                  </h3>
                  <p className="muted">
                    {azHousekeepingStatusLabel(task.status)}
                    {task.assignee ? ` • ${task.assignee}` : ""}
                  </p>
                  {task.guestName ? <p className="muted">Связано с гостем: {task.guestName}</p> : null}
                </div>
              ))}
            </section>
          </section>
        </>
      ) : null}
    </div>
  );
}

