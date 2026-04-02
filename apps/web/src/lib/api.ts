import type {
  AIAssistantItem,
  AISearchResult,
  BookingParseResult,
  OccupancyRecommendation
} from "@hotel-crm/shared/ai";
import type { AuditLog } from "@hotel-crm/shared/audit";
import type { AuthSession, AuthUserSummary } from "@hotel-crm/shared/auth";
import type {
  AzBookingCreate,
  AzChannelDashboard,
  AzChannelSyncRequest,
  AzChannelSyncResult,
  AzCheckInRequest,
  AzCheckOutRequest,
  AzHousekeepingDashboard,
  AzHousekeepingTaskUpdate,
  AzHousekeepingTaskView,
  AzTodayDashboard,
  AzBookingUpdate,
  AzReportSummary,
  AzSettlement,
  AzBookingView,
  AzRoom,
  AzRoomCreate,
  AzRoomUpdate
} from "@hotel-crm/shared/features/azhotel_core";
import type { HousekeepingTaskSummary } from "@hotel-crm/shared/housekeeping";
import type {
  CreateCharge,
  FolioCharge,
  FolioDetails,
  FolioSummary,
  PaymentRecord
} from "@hotel-crm/shared/payments";
import type { PropertySummary } from "@hotel-crm/shared/properties";
import type { ReservationCreate, ReservationSummary } from "@hotel-crm/shared/reservations";
import type { RoomCreate, RoomStatus, RoomSummary } from "@hotel-crm/shared/rooms";
import type { StayRecord } from "@hotel-crm/shared/stays";
import type { SyncConflict } from "@hotel-crm/shared/sync";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001/api";
export const AUTH_TOKEN_STORAGE_KEY = "hotel-crm-auth-token";

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

async function safeRequest<T>(path: string, fallback: T, init?: RequestInit) {
  try {
    return await request<T>(path, init);
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, init?: RequestInit) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-session-token": token } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const rawBody = await response.text();
    try {
      const parsed = JSON.parse(rawBody) as {
        message?: string;
        code?: string;
        details?: Array<{ path?: string; message?: string }>;
      };
      const detailText =
        parsed.details && parsed.details.length > 0
          ? parsed.details
              .map((detail) => detail.message)
              .filter(Boolean)
              .join(" ")
          : "";
      throw new Error(detailText || parsed.message || `Ошибка запроса: ${response.status}`);
    } catch {
      throw new Error(rawBody || `Ошибка запроса: ${response.status}`);
    }
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function loadRemoteSnapshot() {
  const [
    reservations,
    rooms,
    housekeepingTasks,
    payments,
    folios,
    folioDetails,
    stays,
    auditLogs,
    syncConflicts,
    assistantItems
  ] = await Promise.all([
    safeRequest<ReservationSummary[]>("/reservations", []),
    safeRequest<RoomSummary[]>("/rooms", []),
    safeRequest<HousekeepingTaskSummary[]>("/housekeeping/tasks", []),
    safeRequest<PaymentRecord[]>("/payments", []),
    safeRequest<FolioSummary[]>("/payments/folios", []),
    safeRequest<FolioDetails[]>("/payments/folio-details", []),
    safeRequest<StayRecord[]>("/stays", []),
    safeRequest<AuditLog[]>("/audit/logs", []),
    safeRequest<SyncConflict[]>("/sync/conflicts", []),
    safeRequest<AIAssistantItem[]>("/ai/daily-summary", [], {
      method: "POST",
      body: "{}"
    })
  ]);

  return {
    reservations,
    rooms,
    housekeepingTasks,
    payments,
    folios,
    folioDetails,
    stays,
    auditLogs,
    syncConflicts,
    assistantItems
  };
}

export async function createReservationRequest(input: ReservationCreate) {
  return request<ReservationSummary & { syncStatus: string }>("/reservations", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function confirmReservationRequest(reservationId: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/confirm`, {
    method: "POST",
    body: "{}"
  });
}

export async function checkInReservationRequest(reservationId: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/check-in`, {
    method: "POST",
    body: "{}"
  });
}

export async function checkOutReservationRequest(reservationId: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/check-out`, {
    method: "POST",
    body: "{}"
  });
}

export async function reassignReservationRoomRequest(reservationId: string, roomLabel: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/reassign-room`, {
    method: "POST",
    body: JSON.stringify({ roomLabel })
  });
}

export async function updateRoomStatusRequest(roomId: string, status: RoomStatus) {
  return request<RoomSummary>(`/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function createRoomRequest(input: RoomCreate) {
  return request<RoomSummary>("/rooms", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listAzRoomsRequest() {
  return request<AzRoom[]>("/azhotel/rooms");
}

export async function loadAzRoomRequest(id: string) {
  return request<AzRoom>(`/azhotel/rooms/${id}`);
}

export async function createAzRoomRequest(input: AzRoomCreate) {
  return request<AzRoom>("/azhotel/rooms", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateAzRoomRequest(id: string, input: AzRoomUpdate) {
  return request<AzRoom>(`/azhotel/rooms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteAzRoomRequest(id: string) {
  return request<void>(`/azhotel/rooms/${id}`, {
    method: "DELETE"
  });
}

export async function listAzBookingsRequest(filters?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.from) {
    params.set("from", filters.from);
  }
  if (filters?.to) {
    params.set("to", filters.to);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return request<AzBookingView[]>(`/azhotel/bookings${suffix}`);
}

export async function loadAzBookingRequest(id: string) {
  return request<AzBookingView>(`/azhotel/bookings/${id}`);
}

export async function createAzBookingRequest(input: AzBookingCreate) {
  return request<AzBookingView>("/azhotel/bookings", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateAzBookingRequest(id: string, input: AzBookingUpdate) {
  return request<AzBookingView>(`/azhotel/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function quoteAzCheckInRequest(id: string, input: AzCheckInRequest) {
  return request<AzSettlement>(`/azhotel/bookings/${id}/check-in/quote`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function performAzCheckInRequest(id: string, input: AzCheckInRequest) {
  return request<AzSettlement>(`/azhotel/bookings/${id}/check-in`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function quoteAzCheckOutRequest(id: string, input: AzCheckOutRequest) {
  return request<AzSettlement>(`/azhotel/bookings/${id}/check-out/quote`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function performAzCheckOutRequest(id: string, input: AzCheckOutRequest) {
  return request<AzSettlement>(`/azhotel/bookings/${id}/check-out`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function loadAzHousekeepingDashboardRequest() {
  return request<AzHousekeepingDashboard>("/azhotel/housekeeping/dashboard");
}

export async function listAzHousekeepingTasksRequest() {
  return request<AzHousekeepingTaskView[]>("/azhotel/housekeeping/tasks");
}

export async function updateAzHousekeepingTaskRequest(id: string, input: AzHousekeepingTaskUpdate) {
  return request<AzHousekeepingTaskView>(`/azhotel/housekeeping/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function loadAzTodayDashboardRequest() {
  return request<AzTodayDashboard>("/azhotel/dashboard/today");
}

export async function loadAzReportRequest(filters?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.from) {
    params.set("from", filters.from);
  }
  if (filters?.to) {
    params.set("to", filters.to);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return request<AzReportSummary>(`/azhotel/reports${suffix}`);
}

export async function downloadAzReportCsvRequest(filters?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.from) {
    params.set("from", filters.from);
  }
  if (filters?.to) {
    params.set("to", filters.to);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/azhotel/reports/export.csv${suffix}`, {
    headers: {
      ...(token ? { "x-session-token": token } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Не удалось выгрузить CSV: ${response.status}`);
  }

  return response.text();
}

export async function loadAzChannelManagerRequest() {
  return request<{
    dashboard: AzChannelDashboard;
    mock: { today: string; bookingComApi: string; plannedRealIntegration: string };
  }>("/azhotel/channel-manager");
}

export async function syncAzInventoryRequest(input?: AzChannelSyncRequest) {
  return request<AzChannelSyncResult>("/azhotel/channel-manager/sync-inventory", {
    method: "POST",
    body: JSON.stringify(input ?? {})
  });
}

export async function syncAzPricesRequest(input?: AzChannelSyncRequest) {
  return request<AzChannelSyncResult>("/azhotel/channel-manager/sync-prices", {
    method: "POST",
    body: JSON.stringify(input ?? {})
  });
}

export async function updateHousekeepingTaskRequest(taskId: string, status: HousekeepingTaskSummary["status"]) {
  const path =
    status === "in_progress"
      ? `/housekeeping/tasks/${taskId}/start`
      : status === "completed"
        ? `/housekeeping/tasks/${taskId}/complete`
        : status === "cancelled"
          ? `/housekeeping/tasks/${taskId}/cancel`
          : `/housekeeping/tasks/${taskId}`;

  return request<HousekeepingTaskSummary>(path, {
    method: status === "queued" ? "PATCH" : "POST",
    body: status === "queued" ? JSON.stringify({ status }) : "{}"
  });
}

export async function recordPaymentRequest(input: {
  reservationId: string;
  guestName: string;
  amount: number;
  method: "cash" | "card" | "bank_transfer";
  note: string;
  idempotencyKey: string;
}) {
  return request<{ payment: PaymentRecord; folio: FolioDetails }>("/payments", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createChargeRequest(input: CreateCharge) {
  return request<{ charge: FolioCharge; folio: FolioDetails }>("/payments/charges", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function resolveSyncConflictRequest(conflictId: string) {
  return request<SyncConflict>(`/sync/conflicts/${conflictId}/resolve`, {
    method: "POST",
    body: "{}"
  });
}

export async function searchWithAIRequest(query: string) {
  return request<AISearchResult[]>("/ai/search", {
    method: "POST",
    body: JSON.stringify({ query })
  });
}

export async function parseBookingTextRequest(rawText: string) {
  return request<BookingParseResult>("/ai/parse-booking", {
    method: "POST",
    body: JSON.stringify({ rawText })
  });
}

export async function draftGuestMessageRequest(
  guestName: string,
  intent: "confirmation" | "arrival" | "payment_reminder"
) {
  return request<{ message: string; confidence: number }>("/ai/message-draft", {
    method: "POST",
    body: JSON.stringify({ guestName, intent })
  });
}

export async function loadOccupancyRecommendations(reservationId: string) {
  return request<OccupancyRecommendation[]>("/ai/occupancy-hints", {
    method: "POST",
    body: JSON.stringify({ reservationId })
  });
}

export async function listAuthUsersRequest() {
  return request<AuthUserSummary[]>("/auth/users");
}

export async function createStaffUserRequest(input: {
  name: string;
  role: "frontdesk" | "housekeeping" | "accountant";
  azAccessRole: "admin" | "staff";
  pin: string;
}) {
  return request<AuthUserSummary>("/auth/staff", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function loginRequest(identifier: string, secret: string) {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, secret })
  });
}

export async function registerOwnerRequest(input: {
  ownerName: string;
  hotelName: string;
  email: string;
  password: string;
  timezone: string;
  currency: string;
  address: string;
}) {
  return request<{ property: PropertySummary; session: AuthSession }>("/auth/register-owner", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function loadSessionRequest() {
  return request<AuthSession>("/auth/session");
}

export async function logoutRequest() {
  return request<void>("/auth/logout", {
    method: "POST",
    body: "{}"
  });
}
