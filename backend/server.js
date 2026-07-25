import "./env.js";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initChatSocket } from "./sockets/chatSocket.js";

// Connect to MongoDB
connectDB();

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Expose io to REST controllers (e.g. the /workspaces/:id/messages fallback
// path) so a message sent over plain HTTP still broadcasts live to anyone
// connected via the socket.
app.set("io", io);

// Attach sockets chat engine listener
initChatSocket(io);

// Listen on Port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 [NEXORA BACKEND] Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  console.log(`📖 Swagger API documentation available at http://localhost:${PORT}/api-docs`);
});