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
import { loginUser, registerUser, getGithubRedirectResult } from "@/services/auth.service";
import { apiClient, setUnauthorizedHandler } from "@/lib/axios";
import { getFirestoreUser } from "@/firebase/firestore.service";
import { auth } from "@/firebase/firebase";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<User>;
  loginWithToken: (token: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "nexora_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(
    () => !!localStorage.getItem("nexora_access_token")
  );

  // ── persist ────────────────────────────────────────────────────────────────
  const persist = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("token");
      localStorage.removeItem("nexora_access_token");
      localStorage.removeItem("nexora_refresh_token");
    }
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem("nexora_refresh_token");
      await apiClient.post("/auth/logout", rt ? { token: rt } : {});
    } catch {
      // always clear local state regardless
    }
    // Sign out of Firebase too so subsequent popup calls start fresh
    try { await auth.signOut(); } catch { /* ignore */ }
    persist(null);
  }, [persist]);

  // Wire axios 401 → logout
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // ── Mount: validate token + merge Firestore data ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Handle GitHub redirect result (popup-blocked fallback)
      try {
        const redirectData = await getGithubRedirectResult();
        if (redirectData && !cancelled) {
          localStorage.setItem("token", redirectData.token);
          localStorage.setItem("nexora_access_token", redirectData.token);
          if (redirectData.refreshToken) {
            localStorage.setItem("nexora_refresh_token", redirectData.refreshToken);
          }
          persist(redirectData.user);
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        console.error("[AuthContext] GitHub redirect error:", err.message);
      }

      // 2. Rehydrate from stored token
      const token = localStorage.getItem("nexora_access_token");
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
      } catch {
        if (!cancelled) {
          persist(null);
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: AuthCredentials) => {
    const data = await loginUser(credentials);
    persist(data.user);
    localStorage.setItem("token", data.token);
    localStorage.setItem("nexora_access_token", data.token);
    if (data.refreshToken) localStorage.setItem("nexora_refresh_token", data.refreshToken);
    return data.user;
  }, [persist]);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await registerUser({
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    });
    if (data.token) {
      persist(data.user);
      localStorage.setItem("token", data.token);
      localStorage.setItem("nexora_access_token", data.token);
      if (data.refreshToken) localStorage.setItem("nexora_refresh_token", data.refreshToken);
    }
    return data.user;
  }, [persist]);

  // ── loginWithToken (used after OAuth popup) ────────────────────────────────
  const loginWithToken = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("nexora_access_token", token);

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
      logout,
      updateUser,
    }),
    [user, isLoading, login, loginWithToken, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
