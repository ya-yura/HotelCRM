import type { AuthSession, AuthUserSummary } from "@hotel-crm/shared/auth";
import type { PaymentRecord } from "@hotel-crm/shared/payments";
import type { ReservationSummary } from "@hotel-crm/shared/reservations";
import type { StayRecord } from "@hotel-crm/shared/stays";

type OnboardingStep = {
  id: "rooms" | "staff" | "booking" | "operations";
  title: string;
  detail: string;
  done: boolean;
  cta: string;
  label: string;
};

type OnboardingInput = {
  session: AuthSession | null;
  users: AuthUserSummary[];
  rooms: Array<unknown>;
  reservations: ReservationSummary[];
  stays: StayRecord[];
  payments: PaymentRecord[];
};

type OnboardingState = {
  isOwner: boolean;
  staffCount: number;
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
  needsSetup: boolean;
  nextStep: OnboardingStep | null;
  steps: OnboardingStep[];
};

export function withGuideMode(path: string) {
  return path.includes("?") ? `${path}&guide=1` : `${path}?guide=1`;
}

export function deriveOnboardingState({
  session,
  users,
  rooms,
  reservations,
  stays,
  payments
}: OnboardingInput): OnboardingState {
  const isOwner = session?.role === "owner";
  const staffCount = users.filter((user) => user.role !== "owner").length;
  const hasRooms = rooms.length > 0;
  const hasStaff = staffCount > 0;
  const hasBookings = reservations.length > 0;
  const hasOperationalRun =
    reservations.some((reservation) => ["checked_in", "checked_out"].includes(reservation.status)) ||
    stays.length > 0 ||
    payments.length > 0;

  const steps: OnboardingStep[] = [
    {
      id: "rooms",
      title: "Добавьте номера",
      done: hasRooms,
      detail: hasRooms
        ? `Номеров уже в системе: ${rooms.length}`
        : "Сначала заведите номерной фонд, чтобы можно было продавать размещение.",
      cta: "/shahmatka/rooms",
      label: hasRooms ? "Проверить номера" : "Добавить номера"
    },
    {
      id: "staff",
      title: "Добавьте сотрудников",
      done: hasStaff,
      detail: hasStaff
        ? `Сотрудников уже добавлено: ${staffCount}`
        : "Раздайте доступ администратору и уборке, чтобы не работать под владельцем.",
      cta: "/shahmatka/users",
      label: hasStaff ? "Открыть сотрудников" : "Добавить сотрудника"
    },
    {
      id: "booking",
      title: "Создайте первую бронь",
      done: hasBookings,
      detail: hasBookings
        ? `Броней уже создано: ${reservations.length}`
        : "Проверьте боевой сценарий на реальной броне: даты, номер и гость.",
      cta: "/shahmatka/bookings/new",
      label: hasBookings ? "Открыть брони" : "Создать бронь"
    },
    {
      id: "operations",
      title: "Проведите первый рабочий цикл",
      done: hasOperationalRun,
      detail: hasOperationalRun
        ? "Система уже использовалась в реальном рабочем потоке."
        : "Сделайте тестовый заезд, выезд или оплату, чтобы команда поняла ежедневную работу.",
      cta: "/shahmatka/today",
      label: hasOperationalRun ? "Открыть обзор дня" : "Пройти рабочий день"
    }
  ];

  const completedSteps = steps.filter((step) => step.done).length;
  const isComplete = completedSteps === steps.length;

  return {
    isOwner,
    staffCount,
    completedSteps,
    totalSteps: steps.length,
    isComplete,
    needsSetup: Boolean(isOwner && !isComplete),
    nextStep: steps.find((step) => !step.done) ?? null,
    steps
  };
}
