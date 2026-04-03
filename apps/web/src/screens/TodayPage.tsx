import { Link, useLocation, useSearchParams } from "react-router-dom";
import { SyncBanner } from "../components/SyncBanner";
import { DashboardCard } from "../components/DashboardCard";
import { deriveOnboardingState, withGuideMode } from "../lib/onboarding";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { aiTypeLabel, conflictEntityLabel, syncStatusLabel } from "../lib/ru";

export function TodayPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { session, users } = useAuth();
  const {
    reservations,
    rooms,
    folios,
    stays,
    payments,
    complianceSubmissions,
    isOnline,
    syncQueue,
    syncConflicts,
    assistantItems,
    retrySyncItemNow,
    resolveSyncConflict
  } = useHotelStore();
  const queued = syncQueue.filter((item) => item.status !== "synced").length;
  const failed = syncQueue.filter((item) => item.status === "failed_retryable" || item.status === "failed_conflict").length;
  const retrying = syncQueue.filter((item) => item.status === "failed_retryable").length;
  const conflicts = syncConflicts.length;
  const actionableSyncItems = syncQueue.filter((item) => item.status !== "synced").slice(0, 6);
  const activeReservations = reservations.filter(
    (reservation) => !["cancelled", "no_show", "checked_out"].includes(reservation.status)
  );
  const unsettledFolios = folios.filter((folio) => folio.status !== "paid");
  const dueDepartures = reservations.filter((reservation) => reservation.status === "checked_in");
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms,
    reservations,
    stays,
    payments
  });
  const isGuideMode = searchParams.get("guide") === "1";
  const onboardingNotice =
    typeof location.state === "object" && location.state && "onboardingNotice" in location.state
      ? String((location.state as { onboardingNotice?: string }).onboardingNotice ?? "")
      : "";
  const paidTotal = folios.reduce((sum, folio) => sum + folio.paidAmount, 0);
  const outstandingTotal = folios.reduce((sum, folio) => sum + folio.balanceDue, 0);
  const occupancyRate = rooms.length > 0 ? Math.round((rooms.filter((room) => room.status === "occupied").length / rooms.length) * 100) : 0;
  const cards = [
    {
      title: "Заезды",
      value: String(activeReservations.length),
      detail: `${unsettledFolios.length} с неоплатой`,
      tone: "warning" as const
    },
    {
      title: "Выезды",
      value: String(dueDepartures.length),
      detail: `${dueDepartures.filter((reservation) => reservation.balanceDue === 0).length} готовы к закрытию`,
      tone: "info" as const
    },
    {
      title: "Нужна уборка",
      value: String(rooms.filter((room) => room.status === "dirty" || room.status === "cleaning").length),
      detail: `${rooms.filter((room) => room.priority === "arrival_soon").length} критично к ближайшему заезду`,
      tone: "danger" as const
    },
    {
      title: "Заселено",
      value: String(rooms.filter((room) => room.status === "occupied").length),
      detail: `${rooms.filter((room) => room.status === "available").length} готовы прямо сейчас`,
      tone: "success" as const
    }
  ];

  return (
    <div className="screen">
      <section className="hero-panel">
        <p className="eyebrow">Сегодня в работе</p>
        <h2>Здесь должно решаться всё срочное по отелю.</h2>
        <p className="muted">
          Всё важное видно сразу: заезды, выезды, долги, уборка и проблемы синхронизации.
        </p>
      </section>

      <SyncBanner
        isOnline={isOnline}
        queuedCount={queued}
        retryingCount={retrying}
        failedCount={failed}
        conflictCount={conflicts}
        onRetryFailed={() => {
          syncQueue
            .filter((item) => item.status === "failed_retryable" || item.status === "failed_conflict")
            .forEach((item) => retrySyncItemNow(item.id));
        }}
      />

      {onboarding.needsSetup ? (
        <section className="panel tone-info">
          <p className="eyebrow">Первый запуск</p>
          <h3>Отель ещё не доведён до рабочего состояния.</h3>
          <p className="muted">
            Осталось шагов: {onboarding.totalSteps - onboarding.completedSteps}. Следующий приоритет:{" "}
            {onboarding.nextStep?.title?.toLowerCase() ?? "завершить запуск"}.
          </p>
          <div className="status-actions">
            <Link className="secondary-link" to="/shahmatka/whats-new">
              Пройти онбординг
            </Link>
            <Link className="secondary-link" to="/setup">
              Открыть чек-лист запуска
            </Link>
          </div>
        </section>
      ) : null}

      {onboarding.isOwner && (isGuideMode || onboarding.nextStep?.id === "operations") ? (
        <section className="panel tone-success">
          <p className="eyebrow">Шаг 4 из 4</p>
          <h3>Пройдите первый рабочий цикл</h3>
          <p className="muted">
            Теперь нужно не просто создать данные, а реально пройти один ежедневный сценарий: заезд, выезд или оплату.
          </p>
          {onboardingNotice ? <p className="muted">{onboardingNotice}</p> : null}
          <div className="status-actions">
            <Link className="secondary-link" to={withGuideMode("/shahmatka/check-in")}>
              Открыть заезд
            </Link>
            <Link className="secondary-link" to={withGuideMode("/payments")}>
              Открыть оплаты
            </Link>
            <Link className="secondary-link" to={withGuideMode("/shahmatka/bookings")}>
              Вернуться в шахматку
            </Link>
          </div>
        </section>
      ) : onboardingNotice ? (
        <section className="panel tone-success">
          <p className="muted">{onboardingNotice}</p>
        </section>
      ) : null}

      <section className="grid">
        {cards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </section>

      {complianceSubmissions.filter((item) => item.status === "failed").length > 0 ? (
        <section className="panel tone-danger">
          <p className="eyebrow">Комплаенс</p>
          <h3>Есть сбои отправки в государственные системы</h3>
          <p className="muted">
            Ошибок: {complianceSubmissions.filter((item) => item.status === "failed").length}. Откройте раздел комплаенса и повторите отправку.
          </p>
          <div className="status-actions">
            <Link className="secondary-link" to="/compliance">
              Открыть комплаенс
            </Link>
          </div>
        </section>
      ) : null}

          {session?.role === "owner" || session?.role === "manager" || session?.role === "accountant" ? (
        <section className="panel">
          <p className="eyebrow">Краткая картина</p>
          <h3>Деньги и загрузка в одном месте</h3>
          <div className="stats-strip">
            <div>
              <p className="muted">Оплачено</p>
              <strong>{paidTotal}</strong>
            </div>
            <div>
              <p className="muted">Долг</p>
              <strong>{outstandingTotal}</strong>
            </div>
            <div>
              <p className="muted">Загрузка</p>
              <strong>{occupancyRate}%</strong>
            </div>
          </div>
          <div className="mini-bars" aria-hidden="true">
            <div className="mini-bar">
              <span className="mini-bar-label">Оплачено</span>
              <div className="mini-bar-track">
                <div
                  className="mini-bar-fill success"
                  style={{ width: `${Math.max(Math.min((paidTotal / Math.max(paidTotal + outstandingTotal, 1)) * 100, 100), 8)}%` }}
                />
              </div>
            </div>
            <div className="mini-bar">
              <span className="mini-bar-label">Долг</span>
              <div className="mini-bar-track">
                <div
                  className="mini-bar-fill danger"
                  style={{ width: `${Math.max(Math.min((outstandingTotal / Math.max(paidTotal + outstandingTotal, 1)) * 100, 100), 8)}%` }}
                />
              </div>
            </div>
            <div className="mini-bar">
              <span className="mini-bar-label">Загрузка</span>
              <div className="mini-bar-track">
                <div className="mini-bar-fill info" style={{ width: `${Math.max(occupancyRate, 8)}%` }} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="screen">
        {assistantItems.map((item) => (
          <article className="panel" key={item.id}>
            <p className="eyebrow">
              {aiTypeLabel(item.type)} • уверенность {Math.round(item.confidence * 100)}%
            </p>
            <h3>{item.title}</h3>
            <p className="muted">{item.detail}</p>
            <button className="secondary-button" type="button">
              {item.actionLabel}
            </button>
          </article>
        ))}
      </section>

      <section className="screen">
        {actionableSyncItems.map((item) => (
          <article className="panel" key={item.id}>
            <p className="eyebrow">Очередь синхронизации</p>
            <h3>{item.summary}</h3>
            <p className="muted">
              {syncStatusLabel(item.status)} • {item.lastAttemptLabel}
            </p>
            <div className="status-actions">
              {item.status !== "syncing" ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => retrySyncItemNow(item.id)}
                >
                  Повторить сейчас
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="screen" id="conflict-inbox">
        {syncConflicts.map((conflict) => (
          <article className="panel" key={conflict.id}>
            <p className="eyebrow">Конфликты</p>
            <h3>{conflictEntityLabel(conflict.entityType)}: нужно проверить</h3>
            <p className="muted">Локально: {conflict.localSummary}</p>
            <p className="muted">На сервере: {conflict.serverSummary}</p>
            <p className="muted">Что делать: {conflict.recommendedAction}</p>
            <div className="status-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => resolveSyncConflict(conflict.id)}
              >
                Подтвердить локально
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
