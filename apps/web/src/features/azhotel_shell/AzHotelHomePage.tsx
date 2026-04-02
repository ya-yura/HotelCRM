import { Link } from "react-router-dom";
import { deriveOnboardingState } from "../../lib/onboarding";
import { useAuth } from "../../state/authStore";
import { useHotelStore } from "../../state/hotelStore";
import {
  azhotelBookingsEnabled,
  azhotelChannelManagerEnabled,
  azhotelDashboardEnabled,
  azhotelFrontdeskEnabled,
  azhotelHousekeepingEnabled,
  azhotelReportsEnabled,
  azhotelRoomsEnabled
} from "../../lib/featureFlags";

export function AzHotelHomePage() {
  const { session, users, hasAnyAzAccess, hasAnyRole } = useAuth();
  const { rooms, reservations, stays, payments } = useHotelStore();
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms,
    reservations,
    stays,
    payments
  });
  const quickActions = [
    ...(hasAnyRole(["owner", "frontdesk"]) ? [{ to: "/shahmatka/bookings/new", label: "Создать бронь", detail: "Новый заезд или запись по телефону." }] : []),
    ...(hasAnyRole(["owner", "frontdesk"]) ? [{ to: "/shahmatka/check-in", label: "Заселить гостя", detail: "Быстрый заезд по подтверждённой брони." }] : []),
    ...(hasAnyRole(["owner", "frontdesk"]) ? [{ to: "/shahmatka/check-out", label: "Закрыть выезд", detail: "Финальный расчёт и освобождение номера." }] : []),
    ...(hasAnyRole(["owner", "frontdesk", "housekeeping"]) ? [{ to: "/shahmatka/housekeeping/tasks", label: "Задачи уборки", detail: "Что нужно сделать прямо сейчас." }] : []),
    ...(hasAnyAzAccess(["admin"]) ? [{ to: "/shahmatka/users", label: "Добавить сотрудника", detail: "Новый сотрудник и права доступа." }] : []),
    ...(hasAnyRole(["owner", "frontdesk"]) ? [{ to: "/shahmatka/rooms", label: "Проверить номера", detail: "Статусы, цены и готовность к продаже." }] : []),
  ];

  const modules = [
    ...(azhotelDashboardEnabled ? [{ to: "/shahmatka/today", title: "Обзор дня", detail: "Заезды, выезды, загрузка и быстрые цифры.", roles: ["owner", "frontdesk", "housekeeping"] as const, adminOnly: false }] : []),
    ...(azhotelBookingsEnabled ? [{ to: "/shahmatka/bookings", title: "Шахматка и брони", detail: "Календарь, создание и редактирование броней.", roles: ["owner", "frontdesk"] as const, adminOnly: false }] : []),
    ...(azhotelRoomsEnabled ? [{ to: "/shahmatka/rooms", title: "Номера", detail: "Типы, статусы и правила цены.", roles: ["owner", "frontdesk"] as const, adminOnly: false }] : []),
    ...(azhotelFrontdeskEnabled ? [{ to: "/shahmatka/check-in", title: "Заезд и выезд", detail: "Быстрый поток заселения и выезда с допуслугами.", roles: ["owner", "frontdesk"] as const, adminOnly: false }] : []),
    ...(azhotelHousekeepingEnabled ? [{ to: "/shahmatka/housekeeping", title: "Уборка", detail: "Очередь задач, грязные номера и назначения.", roles: ["owner", "frontdesk", "housekeeping"] as const, adminOnly: false }] : []),
    ...(azhotelReportsEnabled ? [{ to: "/shahmatka/reports", title: "Отчёты", detail: "Выручка, загрузка и выгрузка за период.", roles: ["owner", "frontdesk", "accountant"] as const, adminOnly: true }] : []),
    ...(azhotelChannelManagerEnabled ? [{ to: "/shahmatka/channels", title: "Каналы продаж", detail: "Доступность по площадкам и отправка цен с остатками.", roles: ["owner", "frontdesk"] as const, adminOnly: true }] : []),
    { to: "/shahmatka/users", title: "Пользователи", detail: "Дополнительные аккаунты и права доступа.", roles: ["owner", "frontdesk", "housekeeping", "accountant"] as const, adminOnly: true }
  ];

  return (
    <div className="screen">
      <section className="hero-panel">
        <p className="eyebrow">Шахматка</p>
        <h2>Всё, что нужно смене, в одном месте.</h2>
        <p className="muted">
          Шахматка, стойка, уборка, отчёты, каналы продаж и права доступа работают как единая система, а не как набор разрозненных экранов.
        </p>
        <p className="muted">
          Отель: {session?.propertyName} • доступ: {session?.azAccessRole === "admin" ? "админ" : "сотрудник"}
        </p>
      </section>

      {onboarding.needsSetup ? (
        <section className="panel tone-info">
          <p className="eyebrow">Первый запуск</p>
          <h3>До полноценной работы осталось {onboarding.totalSteps - onboarding.completedSteps} шага</h3>
          <p className="muted">
            Следующий шаг: {onboarding.nextStep?.title?.toLowerCase() ?? "завершить запуск"}.
          </p>
          <div className="status-actions">
            <Link className="secondary-link" to="/shahmatka/whats-new">
              Открыть онбординг
            </Link>
            <Link className="secondary-link" to="/setup">
              Открыть чек-лист запуска
            </Link>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <p className="eyebrow">Быстрый старт</p>
        <h3>Частые действия без лишних переходов</h3>
        <div className="quick-actions-grid">
          {quickActions.map((action) => (
            <Link className="quick-action-card" key={action.to} to={action.to}>
              <strong>{action.label}</strong>
              <span>{action.detail}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="screen">
        {modules.map((module) =>
          hasAnyRole([...module.roles]) && (!module.adminOnly || hasAnyAzAccess(["admin"])) ? (
            <article className="panel" key={module.to}>
              <h3>{module.title}</h3>
              <p className="muted">{module.detail}</p>
              <Link className="secondary-link" to={module.to}>
                Открыть
              </Link>
            </article>
          ) : null
        )}
      </section>
    </div>
  );
}

