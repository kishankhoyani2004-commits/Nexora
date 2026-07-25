import { io, type Socket } from "socket.io-client";

/**
 * VITE_API_BASE_URL is an HTTP API base (e.g. "http://localhost:5000/api" or
 * the relative "/api" behind the Vite dev proxy) — Socket.io needs the bare
 * origin, not the "/api" suffix.
 */
function resolveSocketUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
  const stripped = apiBase.replace(/\/api\/?$/, "");
  return stripped || window.location.origin;
}

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      autoConnect: false,
      auth: { token: localStorage.getItem("nexora_access_token") || "" },
    });
  }
  return socket;
}

/** Connects (or reconnects with a fresh token) the shared workspace chat socket. */
export function connectSocket(): Socket {
  const s = getSocket();
  s.auth = { token: localStorage.getItem("nexora_access_token") || "" };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
