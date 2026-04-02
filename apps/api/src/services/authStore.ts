import type { AuthSession, AuthUserSummary } from "@hotel-crm/shared/auth";
import type { PropertySummary } from "@hotel-crm/shared/properties";
import { getHotelData, updateHotelData } from "./dataStore";

function buildSession(
  user: {
    id: string;
    propertyId: string;
    name: string;
    role: AuthSession["role"];
    azAccessRole: AuthSession["azAccessRole"];
  },
  property: PropertySummary
): AuthSession {
  return {
    token: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    userId: user.id,
    userName: user.name,
    propertyId: property.id,
    propertyName: property.name,
    role: user.role,
    azAccessRole: user.azAccessRole,
    createdAt: new Date().toISOString()
  };
}

export async function listAuthUsers(propertyId?: string): Promise<AuthUserSummary[]> {
  return (await getHotelData()).users
    .filter((user) => user.active && (!propertyId || user.propertyId === propertyId))
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      azAccessRole: user.azAccessRole ?? (user.role === "owner" ? "admin" : "staff"),
      propertyId: user.propertyId,
      pinHint: user.pin ? `PIN ends with ${user.pin.slice(-2)}` : "Password login only"
    }));
}

export async function registerOwner(input: {
  ownerName: string;
  hotelName: string;
  email: string;
  password: string;
  timezone: string;
  currency: string;
  address: string;
}) {
  return updateHotelData(async (data) => {
    const existing = data.users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      return null;
    }

    const propertyId = `prop_${Date.now()}`;
    const property: PropertySummary = {
      id: propertyId,
      name: input.hotelName,
      timezone: input.timezone,
      currency: input.currency,
      address: input.address,
      active: true
    };
    data.properties.unshift(property);

    const owner = {
      id: `user_${Date.now()}`,
      propertyId,
      name: input.ownerName,
      email: input.email.toLowerCase(),
      role: "owner" as const,
      azAccessRole: "admin" as const,
      password: input.password,
      active: true
    };
    data.users.unshift(owner);

    const session = buildSession(owner, property);
    data.authSessions.unshift(session);
    return { property, session };
  });
}

export async function login(input: { identifier: string; secret: string }) {
  return updateHotelData(async (data) => {
    const normalized = input.identifier.trim().toLowerCase();
    const user = data.users.find((entry) => {
      if (!entry.active) {
        return false;
      }

      const emailMatch = entry.email?.toLowerCase() === normalized && entry.password === input.secret;
      const pinMatch = entry.id === input.identifier && entry.pin === input.secret;
      return Boolean(emailMatch || pinMatch);
    });

    if (!user) {
      return null;
    }

    const property = data.properties.find((entry) => entry.id === user.propertyId);
    if (!property) {
      return null;
    }

    const session = buildSession(
      {
        id: user.id,
        propertyId: user.propertyId,
        name: user.name,
        role: user.role,
        azAccessRole: user.azAccessRole ?? (user.role === "owner" ? "admin" : "staff")
      },
      property
    );

    data.authSessions.unshift(session);
    return session;
  });
}

export async function listProperties() {
  return [...(await getHotelData()).properties];
}

export async function createStaffUser(input: {
  propertyId: string;
  name: string;
  role: "frontdesk" | "housekeeping" | "accountant";
  azAccessRole: "admin" | "staff";
  pin: string;
}) {
  return updateHotelData(async (data) => {
    const existingPin = data.users.find(
      (user) => user.propertyId === input.propertyId && user.pin === input.pin && user.active
    );
    if (existingPin) {
      return null;
    }

    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      propertyId: input.propertyId,
      name: input.name,
      role: input.role,
      azAccessRole: input.azAccessRole,
      pin: input.pin,
      active: true
    };
    data.users.unshift(user);
    return user;
  });
}

export async function getSessionByToken(token: string) {
  return (await getHotelData()).authSessions.find((session) => session.token === token) ?? null;
}

export async function logoutSession(token: string) {
  return updateHotelData(async (data) => {
    const index = data.authSessions.findIndex((session) => session.token === token);
    if (index === -1) {
      return false;
    }

    data.authSessions.splice(index, 1);
    return true;
  });
}
