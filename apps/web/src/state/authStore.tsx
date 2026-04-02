import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { AuthSession, AuthUserSummary, AzAccessRole, HotelRole } from "@hotel-crm/shared/auth";
import {
  AUTH_TOKEN_STORAGE_KEY,
  listAuthUsersRequest,
  loadSessionRequest,
  loginRequest,
  logoutRequest,
  registerOwnerRequest
} from "../lib/api";

type AuthStoreValue = {
  users: AuthUserSummary[];
  session: AuthSession | null;
  isLoading: boolean;
  refreshUsers: () => Promise<void>;
  login: (identifier: string, secret: string) => Promise<void>;
  registerOwner: (input: {
    ownerName: string;
    hotelName: string;
    email: string;
    password: string;
    timezone: string;
    currency: string;
    address: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  hasAnyRole: (roles: HotelRole[]) => boolean;
  hasAnyAzAccess: (roles: AzAccessRole[]) => boolean;
};

const AuthStoreContext = createContext<AuthStoreValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [users, setUsers] = useState<AuthUserSummary[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    void loadSessionRequest()
      .then((currentSession) => setSession(currentSession))
      .catch(() => {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setSession(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function refreshUsers() {
    if (!session) {
      setUsers([]);
      return;
    }

    try {
      const items = await listAuthUsersRequest();
      setUsers(items);
    } catch {
      setUsers([]);
    }
  }

  useEffect(() => {
    if (!session) {
      setUsers([]);
      return;
    }

    void refreshUsers();
  }, [session]);

  async function login(identifier: string, secret: string) {
    const nextSession = await loginRequest(identifier, secret);
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, nextSession.token);
    setSession(nextSession);
  }

  async function registerOwner(input: {
    ownerName: string;
    hotelName: string;
    email: string;
    password: string;
    timezone: string;
    currency: string;
    address: string;
  }) {
    const created = await registerOwnerRequest(input);
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, created.session.token);
    setSession(created.session);
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      setSession(null);
      setUsers([]);
    }
  }

  const value = useMemo<AuthStoreValue>(
    () => ({
      users,
      session,
      isLoading,
      refreshUsers,
      login,
      registerOwner,
      logout,
      hasAnyRole: (roles) => (session ? roles.includes(session.role) : false),
      hasAnyAzAccess: (roles) => (session ? roles.includes(session.azAccessRole) : false)
    }),
    [isLoading, session, users]
  );

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthStoreContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
