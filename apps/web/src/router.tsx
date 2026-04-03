import type { PropsWithChildren } from "react";
import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import type { HotelRole } from "@hotel-crm/shared/auth";
import { BookingCalendarPage } from "./features/azhotel_bookings/BookingCalendarPage";
import { BookingFormPage } from "./features/azhotel_bookings/BookingFormPage";
import { ChannelManagerPage } from "./features/azhotel_channel_manager/ChannelManagerPage";
import { AzTodayDashboardPage } from "./features/azhotel_dashboard/AzTodayDashboardPage";
import { CheckInFlowPage } from "./features/azhotel_frontdesk/CheckInFlowPage";
import { CheckOutFlowPage } from "./features/azhotel_frontdesk/CheckOutFlowPage";
import { HousekeepingDashboardPage } from "./features/azhotel_housekeeping/HousekeepingDashboardPage";
import { TaskListPage } from "./features/azhotel_housekeeping/TaskListPage";
import { AzHotelHomePage } from "./features/azhotel_shell/AzHotelHomePage";
import { AzHotelWhatsNewPage } from "./features/azhotel_shell/AzHotelWhatsNewPage";
import { UserManagementPage } from "./features/azhotel_users/UserManagementPage";
import { ReportsPage } from "./features/azhotel_reports/ReportsPage";
import { RoomFormPage } from "./features/azhotel_rooms/RoomFormPage";
import { RoomListPage } from "./features/azhotel_rooms/RoomListPage";
import { azhotelBookingsEnabled, azhotelChannelManagerEnabled, azhotelDashboardEnabled, azhotelFrontdeskEnabled, azhotelFullEnabled, azhotelHousekeepingEnabled, azhotelReportsEnabled, azhotelRoomsEnabled } from "./lib/featureFlags";
import { AppShell } from "./shell/AppShell";
import { LoginPage } from "./screens/LoginPage";
import { CompliancePage } from "./screens/CompliancePage";
import { MaintenancePage } from "./screens/MaintenancePage";
import { ReservationDetailPage } from "./screens/ReservationDetailPage";
import { TodayPage } from "./screens/TodayPage";
import { ReservationsPage } from "./screens/ReservationsPage";
import { RoomDetailPage } from "./screens/RoomDetailPage";
import { RoomsPage } from "./screens/RoomsPage";
import { HousekeepingPage } from "./screens/HousekeepingPage";
import { PaymentsPage } from "./screens/PaymentsPage";
import { SearchPage } from "./screens/SearchPage";
import { SetupPage } from "./screens/SetupPage";
import { SettingsPage } from "./screens/SettingsPage";
import { useAuth } from "./state/authStore";

function RequireAuth({ children }: PropsWithChildren) {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="panel">Загружаем сессию...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireRoles({ roles, children }: PropsWithChildren<{ roles: HotelRole[] }>) {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(roles)) {
    return (
      <div className="screen">
        <section className="panel">
          <p className="eyebrow">Доступ ограничен</p>
          <h2>Для этой роли раздел недоступен.</h2>
          <p className="muted">Войдите под подходящей ролью или попросите владельца переключить доступ.</p>
        </section>
      </div>
    );
  }

  return children;
}

function RequireAzAccess({ roles, children }: PropsWithChildren<{ roles: Array<"admin" | "staff"> }>) {
  const { hasAnyAzAccess } = useAuth();

  if (!hasAnyAzAccess(roles)) {
    return (
      <div className="screen">
        <section className="panel">
          <p className="eyebrow">Доступ ограничен</p>
          <h2>Для этого аккаунта Шахматки раздел недоступен.</h2>
          <p className="muted">Попросите администратора выдать админ-доступ.</p>
        </section>
      </div>
    );
  }

  return children;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: <Navigate to="/today" replace />
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: "today", element: <TodayPage /> },
      { path: "reservations", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "accountant"]}><ReservationsPage /></RequireRoles> },
      { path: "reservations/new", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "accountant"]}><ReservationsPage /></RequireRoles> },
      { path: "reservations/:id", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "accountant"]}><ReservationDetailPage /></RequireRoles> },
      { path: "rooms", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance"]}><RoomsPage /></RequireRoles> },
      { path: "rooms/:id", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance"]}><RoomDetailPage /></RequireRoles> },
      { path: "housekeeping", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance"]}><HousekeepingPage /></RequireRoles> },
      { path: "maintenance", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance"]}><MaintenancePage /></RequireRoles> },
      { path: "compliance", element: <RequireRoles roles={["owner", "manager", "frontdesk", "accountant"]}><CompliancePage /></RequireRoles> },
      { path: "payments", element: <RequireRoles roles={["owner", "manager", "frontdesk", "accountant"]}><PaymentsPage /></RequireRoles> },
      { path: "search", element: <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance", "accountant"]}><SearchPage /></RequireRoles> },
      ...(azhotelFullEnabled
        ? [
            {
              path: "shahmatka",
              element: <AzHotelHomePage />
            },
            {
              path: "shahmatka/whats-new",
              element: <AzHotelWhatsNewPage />
            },
            { path: "azhotel", element: <Navigate to="/shahmatka" replace /> },
            { path: "azhotel/whats-new", element: <Navigate to="/shahmatka/whats-new" replace /> },
            { path: "barkas", element: <Navigate to="/shahmatka" replace /> },
            { path: "barkas/whats-new", element: <Navigate to="/shahmatka/whats-new" replace /> },
          ]
        : []),
      ...(azhotelDashboardEnabled
        ? [
            {
              path: "shahmatka/today",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance"]}>
                  <AzTodayDashboardPage />
                </RequireRoles>
              )
            },
            { path: "azhotel/today", element: <Navigate to="/shahmatka/today" replace /> },
            { path: "barkas/today", element: <Navigate to="/shahmatka/today" replace /> }
          ]
        : []),
      ...(azhotelBookingsEnabled
        ? [
            {
              path: "shahmatka/bookings",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk"]}>
                  <BookingCalendarPage />
                </RequireRoles>
              )
            },
            {
              path: "shahmatka/bookings/new",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk"]}>
                  <BookingFormPage />
                </RequireRoles>
              )
            },
            {
              path: "shahmatka/bookings/:id/edit",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk"]}>
                  <BookingFormPage />
                </RequireRoles>
              )
            },
            { path: "azhotel/bookings", element: <Navigate to="/shahmatka/bookings" replace /> },
            { path: "azhotel/bookings/new", element: <Navigate to="/shahmatka/bookings/new" replace /> },
            { path: "barkas/bookings", element: <Navigate to="/shahmatka/bookings" replace /> },
            { path: "barkas/bookings/new", element: <Navigate to="/shahmatka/bookings/new" replace /> },
            { path: "azhotel/bookings/:id/edit", element: <BookingLegacyRedirect /> }
          ]
        : []),
      ...(azhotelFrontdeskEnabled
        ? [
            {
              path: "shahmatka/check-in",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk"]}>
                  <CheckInFlowPage />
                </RequireRoles>
              )
            },
            {
              path: "shahmatka/check-out",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk"]}>
                  <CheckOutFlowPage />
                </RequireRoles>
              )
            },
            { path: "azhotel/check-in", element: <Navigate to="/shahmatka/check-in" replace /> },
            { path: "azhotel/check-out", element: <Navigate to="/shahmatka/check-out" replace /> },
            { path: "barkas/check-in", element: <Navigate to="/shahmatka/check-in" replace /> },
            { path: "barkas/check-out", element: <Navigate to="/shahmatka/check-out" replace /> }
          ]
        : []),
      ...(azhotelHousekeepingEnabled
        ? [
            {
              path: "shahmatka/housekeeping",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance"]}>
                  <HousekeepingDashboardPage />
                </RequireRoles>
              )
            },
            {
              path: "shahmatka/housekeeping/tasks",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk", "housekeeping", "maintenance"]}>
                  <TaskListPage />
                </RequireRoles>
              )
            },
            { path: "azhotel/housekeeping", element: <Navigate to="/shahmatka/housekeeping" replace /> },
            { path: "azhotel/housekeeping/tasks", element: <Navigate to="/shahmatka/housekeeping/tasks" replace /> },
            { path: "barkas/housekeeping", element: <Navigate to="/shahmatka/housekeeping" replace /> },
            { path: "barkas/housekeeping/tasks", element: <Navigate to="/shahmatka/housekeeping/tasks" replace /> }
          ]
        : []),
      ...(azhotelReportsEnabled
        ? [
            {
              path: "shahmatka/reports",
              element: (
                <RequireAzAccess roles={["admin"]}>
                  <RequireRoles roles={["owner", "manager", "frontdesk", "accountant"]}>
                    <ReportsPage />
                  </RequireRoles>
                </RequireAzAccess>
              )
            },
            { path: "azhotel/reports", element: <Navigate to="/shahmatka/reports" replace /> },
            { path: "barkas/reports", element: <Navigate to="/shahmatka/reports" replace /> }
          ]
        : []),
      ...(azhotelChannelManagerEnabled
        ? [
            {
              path: "shahmatka/channels",
              element: (
                <RequireAzAccess roles={["admin"]}>
                  <RequireRoles roles={["owner", "manager", "frontdesk"]}>
                    <ChannelManagerPage />
                  </RequireRoles>
                </RequireAzAccess>
              )
            },
            { path: "azhotel/channels", element: <Navigate to="/shahmatka/channels" replace /> },
            { path: "barkas/channels", element: <Navigate to="/shahmatka/channels" replace /> }
          ]
        : []),
      {
        path: "shahmatka/users",
        element: (
          <RequireAzAccess roles={["admin"]}>
            <RequireRoles roles={["owner", "manager"]}>
              <UserManagementPage />
            </RequireRoles>
          </RequireAzAccess>
        )
      },
      { path: "azhotel/users", element: <Navigate to="/shahmatka/users" replace /> },
      { path: "barkas/users", element: <Navigate to="/shahmatka/users" replace /> },
      ...(azhotelRoomsEnabled
        ? [
            {
              path: "shahmatka/rooms",
              element: (
                <RequireRoles roles={["owner", "manager", "frontdesk", "maintenance"]}>
                  <RoomListPage />
                </RequireRoles>
              )
            },
            {
              path: "shahmatka/rooms/new",
              element: (
                <RequireRoles roles={["owner", "manager"]}>
                  <RoomFormPage />
                </RequireRoles>
              )
            },
            {
              path: "shahmatka/rooms/:id/edit",
              element: (
                <RequireRoles roles={["owner", "manager"]}>
                  <RoomFormPage />
                </RequireRoles>
              )
            },
            { path: "azhotel/rooms", element: <Navigate to="/shahmatka/rooms" replace /> },
            { path: "azhotel/rooms/new", element: <Navigate to="/shahmatka/rooms/new" replace /> },
            { path: "barkas/rooms", element: <Navigate to="/shahmatka/rooms" replace /> },
            { path: "barkas/rooms/new", element: <Navigate to="/shahmatka/rooms/new" replace /> },
            { path: "azhotel/rooms/:id/edit", element: <RoomLegacyRedirect /> }
          ]
        : []),
      { path: "setup", element: <RequireRoles roles={["owner"]}><SetupPage /></RequireRoles> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);

function BookingLegacyRedirect() {
  const { id } = useParams();
  return <Navigate to={`/shahmatka/bookings/${id}/edit`} replace />;
}

function RoomLegacyRedirect() {
  const { id } = useParams();
  return <Navigate to={`/shahmatka/rooms/${id}/edit`} replace />;
}

