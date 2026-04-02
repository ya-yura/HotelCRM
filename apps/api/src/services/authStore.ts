import type { AuthMethod, AuthSession, AuthUserSummary, HotelRole } from "@hotel-crm/shared/auth";
import {
  propertySummarySchema,
  type PropertySummary,
  type PropertyType
} from "@hotel-crm/shared/properties";
import { createPinHint, hashSecret, verifySecret } from "../lib/credentials";
import { getHotelData, updateHotelData } from "./dataStore";
import type { HotelData, PersistedUser } from "./hotelDataTypes";

function buildPropertyRecord(input: {
  id: string;
  name: string;
  city: string;
  timezone: string;
  currency: string;
  address: string;
  propertyType: PropertyType;
}): PropertySummary {
  return propertySummarySchema.parse({
    id: input.id,
    name: input.name,
    city: input.city,
    timezone: input.timezone,
    currency: input.currency,
    address: input.address,
    active: true,
    propertyType: input.propertyType,
    legalInfo: {
      legalEntityName: input.name,
      taxId: "",
      registrationNumber: "",
      vatRate: "none"
    },
    notificationSettings: {
      newReservationPush: true,
      arrivalReminderPush: true,
      housekeepingAlerts: true,
      financeAlerts: true
    },
    operationSettings: {
      defaultCheckInTime: "14:00",
      defaultCheckOutTime: "12:00",
      housekeepingStartTime: "09:00",
      housekeepingEndTime: "18:00",
      sharedDeviceMode: true
    }
  });
}

function pushAuditLog(
  data: HotelData,
  propertyId: string,
  input: { entityType: "auth" | "property" | "user"; entityId: string; action: string; reason: string }
) {
  data.auditLogs.unshift({
    propertyId,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    reason: input.reason,
    createdAt: new Date().toISOString()
  });
}

function buildSession(
  user: PersistedUser,
  property: PropertySummary,
  authMethod: AuthMethod,
  deviceLabel: string
): AuthSession {
  const now = new Date().toISOString();
  return {
    token: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    userId: user.id,
    userName: user.name,
    propertyId: property.id,
    propertyName: property.name,
    role: user.role,
    azAccessRole: user.azAccessRole ?? (user.role === "owner" ? "admin" : "staff"),
    authMethod,
    deviceLabel,
    quickUnlockEnabled: user.quickUnlockEnabled ?? true,
    createdAt: now,
    recentAuthAt: now
  };
}

function toUserSummary(user: PersistedUser): AuthUserSummary {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    azAccessRole: user.azAccessRole ?? (user.role === "owner" ? "admin" : "staff"),
    propertyId: user.propertyId,
    email: user.email ?? "",
    active: user.active,
    quickUnlockEnabled: user.quickUnlockEnabled ?? true,
    pinHint: user.pinHint ?? (user.pin ? createPinHint(user.pin) : "Password login only")
  };
}

function upgradeLegacySecret(user: PersistedUser, authMethod: AuthMethod, secret: string) {
  if (authMethod === "password" && user.password === secret) {
    user.passwordHash = hashSecret(secret);
    delete user.password;
  }

  if (authMethod === "pin" && user.pin === secret) {
    user.pinHash = hashSecret(secret);
    user.pinHint = createPinHint(secret);
    delete user.pin;
  }
}

function rotateSession(data: HotelData, nextSession: AuthSession) {
  data.authSessions = data.authSessions.filter(
    (session) =>
      !(session.userId === nextSession.userId && session.deviceLabel === nextSession.deviceLabel)
  );
  data.authSessions.unshift(nextSession);
}

function matchesPassword(user: PersistedUser, identifier: string, secret: string) {
  const email = user.email?.trim().toLowerCase();
  return email === identifier && verifySecret(secret, user.passwordHash, user.password);
}

function matchesPin(user: PersistedUser, identifier: string, secret: string) {
  return user.id === identifier && verifySecret(secret, user.pinHash, user.pin);
}

export async function listAuthUsers(propertyId?: string): Promise<AuthUserSummary[]> {
  return (await getHotelData()).users
    .filter((user) => user.active && (!propertyId || user.propertyId === propertyId))
    .map(toUserSummary);
}

export async function registerOwner(input: {
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
  return updateHotelData(async (data) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (existing) {
      return null;
    }

    const propertyId = `prop_${Date.now()}`;
    const property = buildPropertyRecord({
      id: propertyId,
      name: input.hotelName,
      city: input.city,
      timezone: input.timezone,
      currency: input.currency,
      address: input.address,
      propertyType: input.propertyType
    });
    data.properties.unshift(property);

    const owner: PersistedUser = {
      id: `user_${Date.now()}`,
      propertyId,
      name: input.ownerName,
      email: normalizedEmail,
      role: "owner",
      azAccessRole: "admin",
      passwordHash: hashSecret(input.password),
      pinHint: "Password login only",
      quickUnlockEnabled: false,
      active: true
    };
    data.users.unshift(owner);

    const session = buildSession(owner, property, "password", "Primary owner device");
    rotateSession(data, session);
    pushAuditLog(data, propertyId, {
      entityType: "auth",
      entityId: owner.id,
      action: "owner_registered",
      reason: `Workspace ${property.name} created and primary device registered`
    });
    return { property, session };
  });
}

export async function login(input: { identifier: string; secret: string; deviceLabel: string }) {
  return updateHotelData(async (data) => {
    const normalizedIdentifier = input.identifier.trim().toLowerCase();
    const user = data.users.find((entry) => {
      if (!entry.active) {
        return false;
      }

      return (
        matchesPassword(entry, normalizedIdentifier, input.secret) ||
        matchesPin(entry, input.identifier.trim(), input.secret)
      );
    });

    if (!user) {
      const failedCandidate = data.users.find(
        (entry) =>
          entry.active &&
          (entry.email?.trim().toLowerCase() === normalizedIdentifier || entry.id === input.identifier.trim())
      );
      if (failedCandidate) {
        pushAuditLog(data, failedCandidate.propertyId, {
          entityType: "auth",
          entityId: failedCandidate.id,
          action: "login_failed",
          reason: `Failed sign-in from ${input.deviceLabel}`
        });
      }
      return null;
    }

    const property = data.properties.find((entry) => entry.id === user.propertyId);
    if (!property) {
      return null;
    }

    const authMethod = matchesPassword(user, normalizedIdentifier, input.secret) ? "password" : "pin";
    upgradeLegacySecret(user, authMethod, input.secret);

    const session = buildSession(user, property, authMethod, input.deviceLabel.trim());
    rotateSession(data, session);
    pushAuditLog(data, user.propertyId, {
      entityType: "auth",
      entityId: user.id,
      action: "login_success",
      reason: `Signed in with ${authMethod} on ${session.deviceLabel}`
    });
    return session;
  });
}

export async function reauthSession(token: string, secret: string) {
  return updateHotelData(async (data) => {
    const sessionIndex = data.authSessions.findIndex((session) => session.token === token);
    if (sessionIndex === -1) {
      return null;
    }

    const session = data.authSessions[sessionIndex];
    const user = data.users.find((entry) => entry.id === session.userId && entry.propertyId === session.propertyId);
    if (!user || !user.active) {
      return null;
    }

    const passwordValid = verifySecret(secret, user.passwordHash, user.password);
    const pinValid = verifySecret(secret, user.pinHash, user.pin);
    if (!passwordValid && !pinValid) {
      pushAuditLog(data, session.propertyId, {
        entityType: "auth",
        entityId: user.id,
        action: "reauth_failed",
        reason: `Sensitive action confirmation failed on ${session.deviceLabel}`
      });
      return null;
    }

    const authMethod: AuthMethod = passwordValid ? "password" : "pin";
    upgradeLegacySecret(user, authMethod, secret);
    const refreshed: AuthSession = {
      ...session,
      authMethod,
      recentAuthAt: new Date().toISOString()
    };
    data.authSessions[sessionIndex] = refreshed;
    pushAuditLog(data, session.propertyId, {
      entityType: "auth",
      entityId: user.id,
      action: "reauth_success",
      reason: `Sensitive action confirmed on ${session.deviceLabel}`
    });
    return refreshed;
  });
}

export async function listProperties() {
  return [...(await getHotelData()).properties];
}

export async function createStaffUser(input: {
  propertyId: string;
  name: string;
  role: Exclude<HotelRole, "owner">;
  azAccessRole: "admin" | "staff";
  pin: string;
  email?: string;
  quickUnlockEnabled?: boolean;
}) {
  return updateHotelData(async (data) => {
    const existingPin = data.users.find(
      (user) =>
        user.propertyId === input.propertyId &&
        user.active &&
        verifySecret(input.pin, user.pinHash, user.pin)
    );
    if (existingPin) {
      return null;
    }

    const user: PersistedUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      propertyId: input.propertyId,
      name: input.name,
      email: input.email?.trim().toLowerCase() || "",
      role: input.role,
      azAccessRole: input.azAccessRole,
      pinHash: hashSecret(input.pin),
      pinHint: createPinHint(input.pin),
      quickUnlockEnabled: input.quickUnlockEnabled ?? true,
      active: true
    };
    data.users.unshift(user);
    pushAuditLog(data, input.propertyId, {
      entityType: "user",
      entityId: user.id,
      action: "staff_created",
      reason: `${user.role} account created with ${user.azAccessRole} AZ access`
    });
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

    const [removed] = data.authSessions.splice(index, 1);
    pushAuditLog(data, removed.propertyId, {
      entityType: "auth",
      entityId: removed.userId,
      action: "logout",
      reason: `Session on ${removed.deviceLabel} revoked`
    });
    return true;
  });
}
