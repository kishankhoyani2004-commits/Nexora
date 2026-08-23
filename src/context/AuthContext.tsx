import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthCredentials, RegisterPayload, User } from "@/types";
import {
  loginUser,
  registerUser,
  verifyEmailCode,
  resendVerificationCode as resendVerificationCodeRequest,
} from "@/services/auth.service";
import { apiClient, setUnauthorizedHandler, authStorage } from "@/lib/axios";
import { getFirestoreUser } from "@/firebase/firestore.service";
import { auth } from "@/firebase/firebase";
import { connectSocket, disconnectSocket } from "@/lib/socket";

/** Returned by register() for a brand-new local account: no session exists
 *  yet until the user enters the code emailed to them. */
export interface RequiresVerification {
  requiresVerification: true;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** `remember` (default true) picks localStorage vs sessionStorage for the
   *  session — unchecking "Remember me" signs the user out when the browser closes. */
  login: (credentials: AuthCredentials, remember?: boolean) => Promise<User>;
  loginWithToken: (token: string, refreshToken?: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User | RequiresVerification>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resendVerificationCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "nexora_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = authStorage.get(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      authStorage.remove(STORAGE_KEY);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(
    () => !!authStorage.get("nexora_access_token")
  );

  // ── persist ────────────────────────────────────────────────────────────────
  // `remember` only matters when writing a *new* user (login/register/etc.);
  // clearing always wipes both storages so a stale session can't linger.
  const persist = useCallback((nextUser: User | null, remember = true) => {
    setUser(nextUser);
    if (nextUser) {
      authStorage.set(STORAGE_KEY, JSON.stringify(nextUser), remember);
    } else {
      authStorage.remove(STORAGE_KEY);
      authStorage.remove("nexora_access_token");
      authStorage.remove("nexora_refresh_token");
    }
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const rt = authStorage.get("nexora_refresh_token");
      await apiClient.post("/auth/logout", rt ? { token: rt } : {});
    } catch {
      // always clear local state regardless
    }
    // Sign out of Firebase too so subsequent popup calls start fresh
    try { await auth.signOut(); } catch { /* ignore */ }
    disconnectSocket();
    persist(null);
  }, [persist]);

  // Wire axios 401 → logout
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Real-time notifications/presence need a live socket connection as soon as
  // the user is authenticated anywhere in the app, not only while a Workspace
  // page happens to be mounted — so this reconnects (with a fresh token)
  // whenever `user` transitions from null to set, covering login, register,
  // OAuth, and rehydration-on-refresh in one place.
  useEffect(() => {
    if (user) connectSocket();
  }, [user]);

  // ── Mount: validate token + merge Firestore data ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Rehydrate from stored token
      const token = authStorage.get("nexora_access_token");
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        // Primary: validate token + get latest user from MongoDB
        const res = await apiClient.get<{ success: boolean; user: User }>("/auth/me");
        const mongoUser = res.data.user;

        if (mongoUser && !cancelled) {
          persist(mongoUser);
          setIsLoading(false);

          if (mongoUser.provider !== "local") {
            const firebaseUid = auth.currentUser?.uid;
            if (firebaseUid) {
              getFirestoreUser(firebaseUid).then((fsUser) => {
                if (fsUser && !cancelled) {
                  const merged: User = {
                    ...mongoUser,
                    avatar: fsUser.avatar || mongoUser.avatar,
                  };
                  persist(merged);
                }
              }).catch(() => {});
            }
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          // Only clear the session on a genuine auth failure (expired/invalid
          // token → 401). A transient failure here — rate limiting, a 5xx, a
          // network blip — says nothing about whether the token is actually
          // still valid, so treating it the same as "logged out" would wipe
          // a perfectly good session out from under the user mid-visit. The
          // user state already starts from localStorage (see useState above),
          // so simply leaving it alone here keeps them signed in with their
          // last-known profile; the axios 401 interceptor wired above still
          // catches a truly invalid token on the next real request.
          if (error?.response?.status === 401) {
            persist(null);
          }
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: AuthCredentials, remember = true) => {
    const data = await loginUser(credentials);
    persist(data.user, remember);
    authStorage.set("nexora_access_token", data.token, remember);
    if (data.refreshToken) authStorage.set("nexora_refresh_token", data.refreshToken, remember);
    return data.user;
  }, [persist]);

  // ── register ───────────────────────────────────────────────────────────────
  // A brand-new local account has no session yet — the backend withholds
  // tokens until the emailed code is confirmed via verifyEmail() below.
  // OAuth-backed registrations (Firebase fallback) are verified by the
  // provider already, so those still come back with a token immediately.
  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await registerUser({
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    });
    if (data.requiresVerification) {
      return { requiresVerification: true, email: data.email } as RequiresVerification;
    }
    persist(data.user);
    authStorage.set("nexora_access_token", data.token, true);
    if (data.refreshToken) authStorage.set("nexora_refresh_token", data.refreshToken, true);
    return data.user as User;
  }, [persist]);

  // ── verifyEmail (completes registration, issues the first session) ────────
  const verifyEmail = useCallback(async (email: string, code: string) => {
    const data = await verifyEmailCode(email, code);
    persist(data.user);
    authStorage.set("nexora_access_token", data.token, true);
    if (data.refreshToken) authStorage.set("nexora_refresh_token", data.refreshToken, true);
    return data.user as User;
  }, [persist]);

  // ── resendVerificationCode ─────────────────────────────────────────────────
  const resendVerificationCode = useCallback(async (email: string) => {
    await resendVerificationCodeRequest(email);
  }, []);

  // ── loginWithToken (used after OAuth popup) ────────────────────────────────
  const loginWithToken = useCallback(async (token: string, refreshToken?: string) => {
    setIsLoading(true);
    try {
      authStorage.set("nexora_access_token", token, true);
      if (refreshToken) authStorage.set("nexora_refresh_token", refreshToken, true);

      const res = await apiClient.get<{ success: boolean; user: User }>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mongoUser = res.data.user;

      // Merge Firestore avatar if available
      const firebaseUid = auth.currentUser?.uid;
      if (firebaseUid) {
        const fsUser = await getFirestoreUser(firebaseUid);
        if (fsUser) {
          const merged: User = { ...mongoUser, avatar: fsUser.avatar || mongoUser.avatar };
          persist(merged);
          return merged;
        }
      }

      persist(mongoUser);
      return mongoUser;
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  // ── updateUser ─────────────────────────────────────────────────────────────
  const updateUser = useCallback((updatedUser: User) => {
    persist(updatedUser);
  }, [persist]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithToken,
      register,
      verifyEmail,
      resendVerificationCode,
      logout,
      updateUser,
    }),
    [user, isLoading, login, loginWithToken, register, verifyEmail, resendVerificationCode, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
