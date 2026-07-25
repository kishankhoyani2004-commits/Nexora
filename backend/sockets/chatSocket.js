import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import Contract from "../models/Contract.js";
import User from "../models/User.js";
import { logActivity } from "../services/workspaceService.js";
import { notifyUser, userRoom } from "../services/notificationService.js";

// userId -> Set<socketId> — a Set (not a single id) so the same user open in
// two tabs/devices doesn't get marked offline when only one tab disconnects.
const onlineUsers = new Map();

const roomFor = (contractId) => `workspace-${contractId}`;

const isContractMember = (contract, userId) =>
  contract.client.toString() === userId || contract.freelancer.toString() === userId;

const otherPartyId = (contract, userId) =>
  contract.client.toString() === userId ? contract.freelancer.toString() : contract.client.toString();

export const initChatSocket = (io) => {
  // Every socket must present the same JWT the REST API uses — nothing here
  // is reachable by an unauthenticated client (was previously wide open:
  // callers could claim to be any userId with no verification at all).
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required."));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "nexora_secret_key");
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Personal room — lets REST controllers and other sockets push a live
    // notification to this exact user regardless of which workspace (if any)
    // they currently have open.
    socket.join(userRoom(userId));

    // Join the chat room for one Active Project — only that contract's
    // client and freelancer may join (was previously an arbitrary,
    // unauthorized client-supplied room name).
    socket.on("join_workspace", async ({ contractId }, ack) => {
      try {
        const contract = await Contract.findById(contractId);
        if (!contract || !isContractMember(contract, userId)) {
          return ack?.({ success: false, message: "Not authorized for this workspace." });
        }

        socket.join(roomFor(contractId));

        const otherId = otherPartyId(contract, userId);
        const otherOnline = onlineUsers.has(otherId);
        let lastSeen = null;
        if (!otherOnline) {
          const otherUser = await User.findById(otherId).select("lastSeen");
          lastSeen = otherUser?.lastSeen || null;
        }

        ack?.({ success: true });
        socket.emit("presence_update", { userId: otherId, online: otherOnline, lastSeen });
        socket.to(roomFor(contractId)).emit("presence_update", { userId, online: true, lastSeen: null });
      } catch {
        ack?.({ success: false, message: "Unable to join workspace." });
      }
    });

    socket.on("typing", ({ contractId }) => {
      if (contractId) socket.to(roomFor(contractId)).emit("user_typing", { contractId, userId });
    });

    socket.on("stop_typing", ({ contractId }) => {
      if (contractId) socket.to(roomFor(contractId)).emit("user_stop_typing", { contractId, userId });
    });

    // Real-time send path. REST POST /workspaces/:id/messages is the
    // fallback for when the socket isn't connected — both write through
    // the same Message model so MongoDB stays the single source of truth.
    socket.on("send_message", async ({ contractId, content }, ack) => {
      try {
        if (!content?.trim()) return ack?.({ success: false, message: "Message is empty." });

        const contract = await Contract.findById(contractId);
        if (!contract || !isContractMember(contract, userId)) {
          return ack?.({ success: false, message: "Not authorized for this workspace." });
        }

        const message = await Message.create({
          sender: userId,
          recipient: otherPartyId(contract, userId),
          contract: contractId,
          conversationId: roomFor(contractId),
          content: content.trim(),
        });

        const sender = await User.findById(userId).select("fullName avatar");
        const formatted = {
          id: message._id.toString(),
          contractId,
          senderId: userId,
          senderName: sender?.fullName || "",
          senderAvatar: sender?.avatar || "",
          content: message.content,
          read: false,
          createdAt: message.createdAt.toISOString(),
        };

        await logActivity(contractId, userId, "message_sent", `${formatted.senderName} sent a message.`);
        await notifyUser({
          io,
          recipient: otherPartyId(contract, userId),
          title: "New message",
          message: `${formatted.senderName}: ${content.trim().slice(0, 80)}`,
          type: "message",
          link: `/workspace/${contractId}?tab=Messages`,
        });

        io.to(roomFor(contractId)).emit("receive_message", formatted);
        ack?.({ success: true, data: formatted });
      } catch {
        ack?.({ success: false, message: "Failed to send message." });
      }
    });

    socket.on("mark_read", async ({ contractId }) => {
      if (!contractId) return;
      try {
        const result = await Message.updateMany(
          { contract: contractId, recipient: userId, read: false },
          { read: true, readAt: new Date() }
        );
        if (result.modifiedCount > 0) {
          socket.to(roomFor(contractId)).emit("read_receipt", {
            contractId,
            readBy: userId,
            readAt: new Date().toISOString(),
          });
        }
      } catch {
        // Read receipts are best-effort — never crash the connection over one.
      }
    });

    // "disconnecting" (not "disconnect") because socket.rooms is already
    // cleared by the time "disconnect" fires — we need it to know which
    // workspace rooms to notify.
    socket.on("disconnecting", async () => {
      // Capture rooms synchronously — socket.io clears socket.rooms as part
      // of its own (non-awaited) disconnect cleanup, which can complete
      // before an `await` below resumes, silently emptying the set.
      const rooms = Array.from(socket.rooms);

      const sockets = onlineUsers.get(userId);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size > 0) return; // still connected from another tab/device

      onlineUsers.delete(userId);
      const lastSeen = new Date();
      try {
        await User.findByIdAndUpdate(userId, { lastSeen });
      } catch {
        // presence tracking is best-effort
      }

      for (const room of rooms) {
        if (room.startsWith("workspace-")) {
          socket.to(room).emit("presence_update", { userId, online: false, lastSeen: lastSeen.toISOString() });
        }
      }
    });
  });
};
