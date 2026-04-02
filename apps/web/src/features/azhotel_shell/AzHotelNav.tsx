import { NavLink } from "react-router-dom";
import { useAuth } from "../../state/authStore";
import {
  azhotelBookingsEnabled,
  azhotelChannelManagerEnabled,
  azhotelDashboardEnabled,
  azhotelFrontdeskEnabled,
  azhotelHousekeepingEnabled,
  azhotelReportsEnabled,
  azhotelRoomsEnabled
} from "../../lib/featureFlags";

export function AzHotelNav() {
  const { hasAnyRole, hasAnyAzAccess } = useAuth();

  const items = [
    ...(azhotelDashboardEnabled ? [{ to: "/shahmatka", label: "Обзор", roles: ["owner", "manager", "frontdesk", "housekeeping", "maintenance"] as const, adminOnly: false }] : []),
    ...(azhotelDashboardEnabled ? [{ to: "/shahmatka/today", label: "Сегодня", roles: ["owner", "manager", "frontdesk", "housekeeping", "maintenance"] as const, adminOnly: false }] : []),
    ...(azhotelBookingsEnabled ? [{ to: "/shahmatka/bookings", label: "Брони", roles: ["owner", "manager", "frontdesk"] as const, adminOnly: false }] : []),
    ...(azhotelRoomsEnabled ? [{ to: "/shahmatka/rooms", label: "Номера", roles: ["owner", "manager", "frontdesk", "maintenance"] as const, adminOnly: false }] : []),
    ...(azhotelFrontdeskEnabled ? [{ to: "/shahmatka/check-in", label: "Заезд", roles: ["owner", "manager", "frontdesk"] as const, adminOnly: false }] : []),
    ...(azhotelFrontdeskEnabled ? [{ to: "/shahmatka/check-out", label: "Выезд", roles: ["owner", "manager", "frontdesk"] as const, adminOnly: false }] : []),
    ...(azhotelHousekeepingEnabled ? [{ to: "/shahmatka/housekeeping", label: "Уборка", roles: ["owner", "manager", "frontdesk", "housekeeping", "maintenance"] as const, adminOnly: false }] : []),
    ...(azhotelReportsEnabled ? [{ to: "/shahmatka/reports", label: "Отчёты", roles: ["owner", "manager", "frontdesk", "accountant"] as const, adminOnly: true }] : []),
    ...(azhotelChannelManagerEnabled ? [{ to: "/shahmatka/channels", label: "Каналы", roles: ["owner", "manager", "frontdesk"] as const, adminOnly: true }] : []),
    { to: "/shahmatka/users", label: "Пользователи", roles: ["owner", "manager"] as const, adminOnly: true },
    { to: "/shahmatka/whats-new", label: "Что нового", roles: ["owner", "manager", "frontdesk", "housekeeping", "maintenance", "accountant"] as const, adminOnly: false }
  ];

  return (
    <nav className="azhotel-subnav" aria-label="Навигация Шахматки">
      {items.map((item) =>
        hasAnyRole([...item.roles]) && (!item.adminOnly || hasAnyAzAccess(["admin"])) ? (
          <NavLink
            key={item.to}
            className={({ isActive }) => (isActive ? "azhotel-subnav-link active" : "azhotel-subnav-link")}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ) : null
      )}
    </nav>
  );
}

