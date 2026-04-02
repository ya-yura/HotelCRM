import type { AuthSession } from "@hotel-crm/shared/auth";

export function getAzHotelOnboardingKey(session: AuthSession | null) {
  if (!session) {
    return null;
  }

  return `shahmatka-whats-new-seen:${session.propertyId}:${session.userId}`;
}

export function hasSeenAzHotelOnboarding(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return true;
  }

  const key = getAzHotelOnboardingKey(session);
  if (!key) {
    return true;
  }

  return window.localStorage.getItem(key) === "1";
}

export function markAzHotelOnboardingSeen(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  const key = getAzHotelOnboardingKey(session);
  if (!key) {
    return;
  }

  window.localStorage.setItem(key, "1");
}

