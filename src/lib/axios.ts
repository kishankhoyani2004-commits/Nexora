import axios from "axios";

/**
 * Central Axios instance.
 * Base URL is read from the VITE_API_BASE_URL env variable so the
 * Node.js + Express + MongoDB backend can be wired in with zero code changes —
 * just set VITE_API_BASE_URL in a .env file.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ── Remember-me-aware storage ─────────────────────────────────────────────────
// "Remember me" checked (default)  → localStorage,  survives browser restart.
// "Remember me" unchecked          → sessionStorage, cleared when the tab/browser closes,
//                                     but still survives an in-tab refresh.
// Reads always check both so a session started either way keeps working.
export const authStorage = {
  get(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  },
  set(key: string, value: string, remember: boolean) {
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  remove(key: string) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

// Attach JWT access token to every request.
apiClient.interceptors.request.use((config) => {
  const token = authStorage.get("nexora_access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Logout callback — set by AuthProvider on mount so the interceptor can
// trigger a logout without a circular dependency on the context module.
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

// Centralized response/error handling.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && _onUnauthorized) {
      _onUnauthorized();
    }
    return Promise.reject(error);
  }
);
