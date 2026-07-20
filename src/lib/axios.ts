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

// Attach JWT access token to every request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexora_access_token");
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
