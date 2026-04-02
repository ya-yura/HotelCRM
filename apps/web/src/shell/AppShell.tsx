import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import type { HotelRole } from "@hotel-crm/shared/auth";
import { azhotelFullEnabled } from "../lib/featureFlags";
import { deriveOnboardingState, withGuideMode } from "../lib/onboarding";
import { useHotelStore } from "../state/hotelStore";
import { useAuth } from "../state/authStore";
import { hasSeenAzHotelOnboarding } from "../lib/azhotel";
import { roleLabel } from "../lib/ru";
import { AzHotelNav } from "../features/azhotel_shell/AzHotelNav";

const navItems = [
  { to: "/today", label: "Сегодня", roles: ["owner", "frontdesk", "housekeeping", "accountant"] as HotelRole[] },
  { to: "/reservations", label: "Брони", roles: ["owner", "frontdesk", "housekeeping", "accountant"] as HotelRole[] },
  { to: "/rooms", label: "Номера", roles: ["owner", "frontdesk", "housekeeping"] as HotelRole[] },
  { to: "/housekeeping", label: "Уборка", roles: ["owner", "frontdesk", "housekeeping"] as HotelRole[] },
  { to: "/payments", label: "Оплаты", roles: ["owner", "frontdesk", "accountant"] as HotelRole[] },
  { to: "/search", label: "Поиск", roles: ["owner", "frontdesk", "housekeeping", "accountant"] as HotelRole[] },
  ...(azhotelFullEnabled
    ? [{ to: "/shahmatka", label: "Шахматка", roles: ["owner", "frontdesk", "housekeeping", "accountant"] as HotelRole[] }]
    : []),
  { to: "/setup", label: "Запуск", roles: ["owner"] as HotelRole[] },
  { to: "/settings", label: "Настройки", roles: ["owner", "frontdesk", "housekeeping", "accountant"] as HotelRole[] }
];

export function AppShell() {
  const { syncQueue, syncConflicts, rooms, reservations, stays, payments } = useHotelStore();
  const { session, users, logout, hasAnyRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pendingCount = syncQueue.filter((item) => item.status !== "synced").length;
  const isAzHotelRoute = location.pathname.startsWith("/shahmatka");
  const shellTitle = isAzHotelRoute ? "Шахматка" : "Управление отелем";
  const shellEyebrow = isAzHotelRoute ? "Рабочее место отеля" : "Отель работает даже при плохом интернете";
  const hasShownOnboardingRef = useRef(false);
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms,
    reservations,
    stays,
    payments
  });

  useEffect(() => {
    if (!azhotelFullEnabled || !session) {
      return;
    }

    if (hasShownOnboardingRef.current) {
      return;
    }

    if (hasSeenAzHotelOnboarding(session)) {
      hasShownOnboardingRef.current = true;
      return;
    }

    if (location.pathname === "/shahmatka/whats-new") {
      hasShownOnboardingRef.current = true;
      return;
    }

    if (location.pathname !== "/shahmatka") {
      return;
    }

    hasShownOnboardingRef.current = true;
    navigate(onboarding.needsSetup ? "/shahmatka/whats-new" : "/shahmatka/today", { replace: true });
  }, [location.pathname, navigate, onboarding.needsSetup, session]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-copy">
          <p className="eyebrow">{shellEyebrow}</p>
          <h1>{shellTitle}</h1>
          <div className="topbar-meta">
            <span className="meta-pill">{session?.propertyName}</span>
            <span className="meta-pill">{session?.userName}</span>
            <span className="meta-pill">{roleLabel(session?.role)}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="sync-pill">
            {syncConflicts.length > 0
              ? `${syncConflicts.length} конфликт`
              : `${pendingCount} в очереди`}
          </div>
          <button className="secondary-button" onClick={() => void logout()} type="button">
            Выйти
          </button>
        </div>
      </header>

      {azhotelFullEnabled && isAzHotelRoute ? <AzHotelNav /> : null}

      {azhotelFullEnabled && isAzHotelRoute && onboarding.needsSetup ? (
        <section className="onboarding-strip" aria-label="Прогресс запуска">
          <div className="onboarding-strip-copy">
            <p className="eyebrow">Запуск отеля</p>
            <strong>
              {onboarding.completedSteps}/{onboarding.totalSteps} шагов готово
            </strong>
            <p className="muted">
              Дальше: {onboarding.nextStep?.title?.toLowerCase() ?? "завершить запуск"}.
            </p>
          </div>
          <div className="onboarding-strip-progress" aria-hidden="true">
            <div
              className="onboarding-strip-fill"
              style={{
                width: `${Math.max(
                  Math.round((onboarding.completedSteps / Math.max(onboarding.totalSteps, 1)) * 100),
                  8
                )}%`
              }}
            />
          </div>
          <div className="status-actions">
            <NavLink className="secondary-link" to={withGuideMode("/setup")}>
              Продолжить запуск
            </NavLink>
            <NavLink className="secondary-link" to={withGuideMode("/shahmatka/whats-new")}>
              Открыть шаги
            </NavLink>
          </div>
        </section>
      ) : null}

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Основная навигация">
        {navItems.map((item) => (
          hasAnyRole(item.roles) ? (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ) : null
        ))}
      </nav>
    </div>
  );
}

