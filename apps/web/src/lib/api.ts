import type {
  AIAssistantItem,
  AISearchResult,
  BookingParseResult,
  OccupancyRecommendation
} from "@hotel-crm/shared/ai";
import type { AuditLog } from "@hotel-crm/shared/audit";
import type { AuthSession, AuthUserSummary } from "@hotel-crm/shared/auth";
import type {
  ComplianceDataset,
  ComplianceDocument,
  ComplianceKind,
  ComplianceReadiness,
  ComplianceSubmission
} from "@hotel-crm/shared/compliance";
import type {
  AzBookingCreate,
  AzChannelDashboard,
  AzChannelBookingIngest,
  AzChannelSyncRequest,
  AzChannelSyncResult,
  AzCheckInRequest,
  AzCheckOutRequest,
  AzDirectAvailabilityRequest,
  AzDirectAvailabilityResponse,
  AzDirectBookingConfirmation,
  AzDirectProvisionalReservationRequest,
  AzDirectQuote,
  AzDirectQuoteRequest,
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
import type {
  GuestDuplicateCandidate,
  GuestMergeResult,
  GuestProfile,
  GuestUpsert
} from "@hotel-crm/shared/guests";
import type { HousekeepingTaskSummary } from "@hotel-crm/shared/housekeeping";
import type {
  MaintenanceCreate,
  MaintenanceIncident,
  MaintenanceUpdate
} from "@hotel-crm/shared/maintenance";
import type {
  CreateCharge,
  CreatePaymentLink,
  FolioCorrection,
  FolioCharge,
  FolioDetails,
  FolioSummary,
  PaymentRecord,
  PaymentRefund
} from "@hotel-crm/shared/payments";
import type {
  PropertySummary,
  PropertyType,
  PropertyUpdateRequest
} from "@hotel-crm/shared/properties";
import type {
  ReservationCreate,
  ReservationSummary,
  ReservationUpdate
} from "@hotel-crm/shared/reservations";
import type { RoomCreate, RoomStatus, RoomSummary } from "@hotel-crm/shared/rooms";
import type { StayRecord } from "@hotel-crm/shared/stays";
import type { SyncConflict } from "@hotel-crm/shared/sync";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001/api";
export const AUTH_TOKEN_STORAGE_KEY = "hotel-crm-auth-token";

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

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
      throw new ApiError(detailText || parsed.message || `Ошибка запроса: ${response.status}`, parsed.code);
    } catch {
      throw new ApiError(rawBody || `Ошибка запроса: ${response.status}`);
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
    maintenanceIncidents,
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
    safeRequest<MaintenanceIncident[]>("/maintenance/incidents", []),
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
    maintenanceIncidents,
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

export async function updateReservationRequest(reservationId: string, patch: ReservationUpdate) {
  return request<ReservationSummary>(`/reservations/${reservationId}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export async function checkInReservationRequest(reservationId: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/check-in`, {
    method: "POST",
    body: "{}"
  });
}

export async function checkInReservationWithDepositRequest(input: {
  reservationId: string;
  depositAmount?: number;
  paymentMethod?: PaymentRecord["method"];
}) {
  return request<ReservationSummary>(`/reservations/${input.reservationId}/check-in`, {
    method: "POST",
    body: JSON.stringify({
      depositAmount: input.depositAmount,
      paymentMethod: input.paymentMethod
    })
  });
}

export async function checkOutReservationRequest(reservationId: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/check-out`, {
    method: "POST",
    body: "{}"
  });
}

export async function cancelReservationRequest(reservationId: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/cancel`, {
    method: "POST",
    body: "{}"
  });
}

export async function markReservationNoShowRequest(reservationId: string) {
  return request<ReservationSummary>(`/reservations/${reservationId}/no-show`, {
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

export async function sendReservationPaymentLinkRequest(
  reservationId: string,
  channel: "sms" | "whatsapp" | "email",
  method: "sbp" | "yookassa" | "tbank",
  amount?: number
) {
  return request<ReservationSummary>(`/reservations/${reservationId}/payment-link`, {
    method: "POST",
    body: JSON.stringify({ channel, method, amount })
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
    mock: { today: string; providers: Array<"booking_com" | "ostrovok" | "yandex_travel">; bookingComApi: string; plannedRealIntegration: string };
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

export async function syncAzBookingsRequest(input?: AzChannelSyncRequest) {
  return request<AzChannelSyncResult>("/azhotel/channel-manager/sync-bookings", {
    method: "POST",
    body: JSON.stringify(input ?? {})
  });
}

export async function ingestAzChannelBookingRequest(input: AzChannelBookingIngest) {
  return request<ReservationSummary>("/azhotel/channel-manager/ingest-booking", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function requestDirectAvailabilityPublic(propertyId: string, input: AzDirectAvailabilityRequest) {
  return request<AzDirectAvailabilityResponse>(`/public/properties/${propertyId}/booking-engine/availability`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createDirectQuotePublic(propertyId: string, input: AzDirectQuoteRequest) {
  return request<AzDirectQuote>(`/public/properties/${propertyId}/booking-engine/quote`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createDirectProvisionalPublic(propertyId: string, input: AzDirectProvisionalReservationRequest) {
  return request<AzDirectBookingConfirmation>(`/public/properties/${propertyId}/booking-engine/provisional-reservations`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function confirmDirectReservationPublic(propertyId: string, reservationId: string) {
  return request<AzDirectBookingConfirmation>(`/public/properties/${propertyId}/booking-engine/provisional-reservations/${reservationId}/confirm`, {
    method: "POST",
    body: "{}"
  });
}

export async function updateHousekeepingTaskRequest(taskId: string, status: HousekeepingTaskSummary["status"]) {
  let path = `/housekeeping/tasks/${taskId}`;

  if (status === "in_progress") {
    path = `/housekeeping/tasks/${taskId}/start`;
  } else if (status === "paused") {
    path = `/housekeeping/tasks/${taskId}/pause`;
  } else if (status === "inspection_requested") {
    path = `/housekeeping/tasks/${taskId}/request-inspection`;
  } else if (status === "problem_reported") {
    path = `/housekeeping/tasks/${taskId}/problem`;
  } else if (status === "completed") {
    path = `/housekeeping/tasks/${taskId}/complete`;
  } else if (status === "cancelled") {
    path = `/housekeeping/tasks/${taskId}/cancel`;
  }

  return request<HousekeepingTaskSummary>(path, {
    method: status === "queued" ? "PATCH" : "POST",
    body: status === "queued" ? JSON.stringify({ status }) : "{}"
  });
}

export async function patchHousekeepingTaskRequest(taskId: string, input: {
  status?: HousekeepingTaskSummary["status"];
  note?: string;
  dueLabel?: string;
  assigneeName?: string;
  shiftLabel?: string;
  problemNote?: string;
  requestedInspection?: boolean;
  checklist?: HousekeepingTaskSummary["checklist"];
  evidence?: HousekeepingTaskSummary["evidence"];
  consumables?: HousekeepingTaskSummary["consumables"];
}) {
  return request<HousekeepingTaskSummary>(`/housekeeping/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listMaintenanceIncidentsRequest() {
  return request<MaintenanceIncident[]>("/maintenance/incidents");
}

export async function createMaintenanceIncidentRequest(input: MaintenanceCreate) {
  return request<MaintenanceIncident>("/maintenance/incidents", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateMaintenanceIncidentRequest(id: string, input: MaintenanceUpdate) {
  return request<MaintenanceIncident>(`/maintenance/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function resolveMaintenanceIncidentRequest(id: string, input?: MaintenanceUpdate) {
  return request<MaintenanceIncident>(`/maintenance/incidents/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify(input ?? {})
  });
}

export async function recordPaymentRequest(input: {
  reservationId: string;
  guestName: string;
  amount: number;
  method: PaymentRecord["method"];
  provider: PaymentRecord["provider"];
  kind: PaymentRecord["kind"];
  note: string;
  reason: string;
  correlationId: string;
  paymentLinkId: string | null;
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

export async function createPaymentLinkRequest(input: CreatePaymentLink) {
  return request<{ paymentLink: import("@hotel-crm/shared/payments").PaymentLink; folio: FolioDetails }>("/payments/links", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function refundPaymentRequest(paymentId: string, input: PaymentRefund) {
  return request<{ payment: PaymentRecord; folio: FolioDetails }>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function voidPaymentRequest(paymentId: string, input: { reason: string; correlationId?: string }) {
  return request<{ payment: PaymentRecord; folio: FolioDetails }>(`/payments/${paymentId}/void`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createFolioCorrectionRequest(input: FolioCorrection) {
  return request<{ charge: FolioCharge; folio: FolioDetails }>("/payments/corrections", {
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

export async function listGuestsRequest() {
  return request<GuestProfile[]>("/guests");
}

export async function loadGuestRequest(id: string) {
  return request<GuestProfile>(`/guests/${id}`);
}

export async function updateGuestRequest(id: string, input: Partial<GuestUpsert>) {
  return request<GuestProfile>(`/guests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function loadGuestDuplicatesRequest(id: string) {
  return request<GuestDuplicateCandidate[]>(`/guests/${id}/duplicates`);
}

export async function mergeGuestsRequest(primaryGuestId: string, duplicateGuestId: string) {
  return request<GuestMergeResult>("/guests/merge", {
    method: "POST",
    body: JSON.stringify({ primaryGuestId, duplicateGuestId })
  });
}

export async function loadReservationComplianceReadinessRequest(reservationId: string) {
  return request<ComplianceReadiness>(`/compliance/reservations/${reservationId}/readiness`);
}

export async function listComplianceSubmissionsRequest(reservationId?: string) {
  const suffix = reservationId ? `?reservationId=${encodeURIComponent(reservationId)}` : "";
  return request<ComplianceSubmission[]>(`/compliance/submissions${suffix}`);
}

export async function prepareReservationComplianceRequest(
  reservationId: string,
  kinds: ComplianceKind[] = ["mvd", "rosstat"]
) {
  return request<ComplianceSubmission[]>("/compliance/prepare", {
    method: "POST",
    body: JSON.stringify({ reservationId, kinds })
  });
}

export async function submitComplianceSubmissionRequest(submissionId: string) {
  return request<ComplianceSubmission>(`/compliance/submissions/${submissionId}/submit`, {
    method: "POST",
    body: "{}"
  });
}

export async function retryComplianceSubmissionRequest(submissionId: string) {
  return request<ComplianceSubmission>(`/compliance/submissions/${submissionId}/retry`, {
    method: "POST",
    body: "{}"
  });
}

export async function loadReservationComplianceDocumentsRequest(reservationId: string) {
  return request<ComplianceDocument[]>(`/compliance/reservations/${reservationId}/documents`);
}

export async function loadReservationComplianceDatasetsRequest(reservationId: string) {
  return request<ComplianceDataset[]>(`/compliance/reservations/${reservationId}/datasets`);
}

export async function createStaffUserRequest(input: {
  name: string;
  role: "manager" | "frontdesk" | "housekeeping" | "maintenance" | "accountant";
  azAccessRole: "admin" | "staff";
  email?: string;
  pin: string;
  quickUnlockEnabled: boolean;
}) {
  return request<AuthUserSummary>("/auth/staff", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function loginRequest(identifier: string, secret: string, deviceLabel: string) {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, secret, deviceLabel })
  });
}

export async function registerOwnerRequest(input: {
  ownerName: string;
  hotelName: string;
  email: string;
  password: string;
  city: string;
  timezone: string;
  currency: string;
  address: string;
  propertyType: PropertyType;
}) {
  return request<{ property: PropertySummary; session: AuthSession }>("/auth/register-owner", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function reauthRequest(secret: string) {
  return request<AuthSession>("/auth/reauth", {
    method: "POST",
    body: JSON.stringify({ secret })
  });
}

export async function loadCurrentPropertyRequest() {
  return request<PropertySummary>("/properties/current");
}

export async function updateCurrentPropertyRequest(input: PropertyUpdateRequest) {
  return request<PropertySummary>("/properties/current", {
    method: "PATCH",
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
