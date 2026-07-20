import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initChatSocket } from "./sockets/chatSocket.js";
import dotenv from "dotenv";

// Load Environment Variables
dotenv.config();

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

// Attach sockets chat engine listener
initChatSocket(io);

// Listen on Port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 [NEXORA BACKEND] Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  console.log(`📖 Swagger API documentation available at http://localhost:${PORT}/api-docs`);
});