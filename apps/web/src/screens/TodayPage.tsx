import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { buildManagementDashboardSummary } from "@hotel-crm/shared/management";
import { SyncBanner } from "../components/SyncBanner";
import { DashboardCard } from "../components/DashboardCard";
import { loadManagementDashboardRequest } from "../lib/api";
import { deriveOnboardingState, withGuideMode } from "../lib/onboarding";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import { aiTypeLabel, conflictEntityLabel, syncStatusLabel } from "../lib/ru";

const DISMISSED_ALERTS_STORAGE_KEY = "hotel-crm-dismissed-owner-alerts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value);
}

function readDismissedAlerts() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_ALERTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDismissedAlerts(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DISMISSED_ALERTS_STORAGE_KEY, JSON.stringify(ids));
}

export function TodayPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, users } = useAuth();
  const {
    reservations,
    rooms,
    housekeepingTasks,
    maintenanceIncidents,
    folios,
    stays,
    payments,
    complianceSubmissions,
    isOnline,
    syncQueue,
    syncConflicts,
    retrySyncItemNow,
    resolveSyncConflict
  } = useHotelStore();
  const [remoteDashboard, setRemoteDashboard] = useState<ReturnType<typeof buildManagementDashboardSummary> | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => readDismissedAlerts());

  const queued = syncQueue.filter((item) => item.status !== "synced").length;
  const failed = syncQueue.filter((item) => item.status === "failed_retryable" || item.status === "failed_conflict").length;
  const retrying = syncQueue.filter((item) => item.status === "failed_retryable").length;
  const conflicts = syncConflicts.length;
  const actionableSyncItems = syncQueue.filter((item) => item.status !== "synced").slice(0, 6);
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

  const localDashboard = useMemo(
    () =>
      buildManagementDashboardSummary({
        reservations,
        rooms,
        housekeepingTasks,
        maintenanceIncidents,
        folios,
        payments,
        complianceSubmissions,
        syncConflictCount: syncConflicts.length,
        sourceMode: "cached"
      }),
    [complianceSubmissions, folios, housekeepingTasks, maintenanceIncidents, payments, reservations, rooms, syncConflicts.length]
  );

  useEffect(() => {
    setDashboardLoading(true);
    setDashboardError("");
    loadManagementDashboardRequest()
      .then((summary) => {
        setRemoteDashboard(summary);
      })
      .catch((cause) => {
        setRemoteDashboard(null);
        setDashboardError(cause instanceof Error ? cause.message : "Не удалось загрузить дашборд");
      })
      .finally(() => {
        setDashboardLoading(false);
      });
  }, []);

  const preferLocalDashboard = !isOnline || queued > 0 || retrying > 0 || failed > 0;
  const dashboard = preferLocalDashboard || !remoteDashboard ? localDashboard : remoteDashboard;
  const usingCachedDashboard = dashboard.sourceMode === "cached" || preferLocalDashboard || !remoteDashboard;
  const visibleAlerts = dashboard.alerts.filter((item) => !dismissedAlertIds.includes(item.id));
  const maxTrendRevenue = Math.max(...dashboard.series.map((point) => point.bookedRevenue), 1);

  function dismissAlert(alertId: string) {
    const next = [...dismissedAlertIds, alertId];
    setDismissedAlertIds(next);
    writeDismissedAlerts(next);
  }

  function restoreAlerts() {
    setDismissedAlertIds([]);
    writeDismissedAlerts([]);
  }

  function openAlertTarget(target: string) {
    if (!target) {
      return;
    }

    const [path, hash] = target.split("#");
    if (path) {
      navigate(path + (hash ? `#${hash}` : ""));
      return;
    }

    if (hash) {
      navigate(`/today#${hash}`);
    }
  }

  return (
    <div className="screen">
      <section className="hero-panel">
        <p className="eyebrow">Сегодня в работе</p>
        <h2>За минуту видно, что с отелем, деньгами и номерным фондом.</h2>
        <p className="muted">{dashboard.summaryText}</p>
        <div className="status-actions">
          <Link className="secondary-link" to="/reports">
            Открыть отчёты
          </Link>
          <Link className="secondary-link" to="/payments">
            Проверить оплаты
          </Link>
        </div>
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

      {usingCachedDashboard ? (
        <section className="panel tone-warning">
          <p className="eyebrow">Кешированная сводка</p>
          <h3>Дашборд продолжает работать даже при проблемах с сетью или API.</h3>
          <p className="muted">
            Сейчас показываем локально рассчитанную картину по бронированиям, folio, платежам и состоянию номерного фонда.
          </p>
        </section>
      ) : null}

      {dashboardError ? (
        <section className="panel">
          <p className="error-text">{dashboardError}</p>
        </section>
      ) : null}

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
        {dashboard.kpis.map((card) => (
          <DashboardCard
            key={card.id}
            title={card.label}
            value={card.value}
            detail={card.detail}
            tone={card.tone === "neutral" ? "info" : card.tone}
          />
        ))}
      </section>

      <section className="management-two-column">
        <article className="panel">
          <p className="eyebrow">Следующее лучшее действие</p>
          <h3>{dashboard.nextBestAction}</h3>
          <div className="management-kpi-grid">
            <div className="management-kpi-cell">
              <span className="muted">Прямые продажи</span>
              <strong>{dashboard.metrics.directShare}%</strong>
            </div>
            <div className="management-kpi-cell">
              <span className="muted">OTA доля</span>
              <strong>{dashboard.metrics.otaShare}%</strong>
            </div>
            <div className="management-kpi-cell">
              <span className="muted">Не собрано денег</span>
              <strong>{formatCurrency(dashboard.cash.outstandingBalanceTotal)} ₽</strong>
            </div>
            <div className="management-kpi-cell">
              <span className="muted">Чеки в ожидании</span>
              <strong>{dashboard.cash.pendingFiscalReceipts}</strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Микс каналов</p>
          <div className="compact-stack">
            {dashboard.sourceMix.map((source) => (
              <div className="source-mix-row" key={source.source}>
                <div>
                  <strong>{source.source}</strong>
                  <p className="muted">{source.reservations} броней • {source.nights} ночей</p>
                </div>
                <div className="source-mix-metrics">
                  <span>{formatCurrency(source.bookedRevenue)} ₽</span>
                  <span>{source.sharePercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Выручка по дням</p>
        <div className="report-chart">
          {dashboard.series.map((point) => (
            <div className="report-bar-row" key={point.date}>
              <div className="report-bar-label">{point.date}</div>
              <div className="report-bar-track">
                <div
                  className="report-bar-fill success"
                  style={{ width: `${Math.max(Math.round((point.bookedRevenue / maxTrendRevenue) * 100), 2)}%` }}
                />
              </div>
              <div className="report-bar-value">
                {formatCurrency(point.bookedRevenue)} ₽ • {point.occupancyRate}%
              </div>
            </div>
          ))}
        </div>
      </section>

      {(session?.role === "owner" || session?.role === "manager" || session?.role === "accountant") && visibleAlerts.length > 0 ? (
        <section className="screen">
          {visibleAlerts.map((item) => (
            <article className="panel" key={item.id}>
              <p className="eyebrow">
                {aiTypeLabel(item.type)} • уверенность {Math.round(item.confidence * 100)}%
              </p>
              <h3>{item.title}</h3>
              <p className="muted">{item.detail}</p>
              <div className="status-actions">
                <button className="secondary-button" type="button" onClick={() => openAlertTarget(item.actionTarget)}>
                  {item.actionLabel}
                </button>
                {item.dismissible ? (
                  <button className="ghost-button" type="button" onClick={() => dismissAlert(item.id)}>
                    Скрыть до обновления дня
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {(session?.role === "owner" || session?.role === "manager" || session?.role === "accountant") && visibleAlerts.length === 0 && dismissedAlertIds.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">AI-оператор</p>
          <h3>Все подсказки на сегодня скрыты.</h3>
          <div className="status-actions">
            <button className="secondary-button" type="button" onClick={restoreAlerts}>
              Вернуть подсказки
            </button>
          </div>
        </section>
      ) : null}

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

      {dashboardLoading ? (
        <section className="panel">
          <p className="muted">Обновляем управленческую сводку...</p>
        </section>
      ) : null}

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
