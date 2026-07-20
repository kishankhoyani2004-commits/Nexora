import Message from "../models/Message.js";

// Online user list mapping: userId -> socketId
const onlineUsers = new Map();

export const initChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 [SOCKET.IO] New connection established: ${socket.id}`);

    // Register active user
    socket.on("register_user", (userId) => {
      if (userId) {
        onlineUsers.set(userId, socket.id);
        console.log(`👤 User registered online: ${userId} (Socket: ${socket.id})`);
        io.emit("online_users", Array.from(onlineUsers.keys()));
      }
    });

    // Join conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`🗣️ Socket ${socket.id} joined room: ${conversationId}`);
    });

    // Handle peer typing indicators
    socket.on("typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("user_typing", { conversationId, userId });
    });

    socket.on("stop_typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("user_stop_typing", { conversationId, userId });
    });

    // Handle instant message sending
    socket.on("send_message", async (msgPayload) => {
      const { conversationId, senderId, recipientId, content } = msgPayload;

      try {
        const message = await Message.create({
          sender: senderId,
          recipient: recipientId,
          conversationId,
          content,
          read: false,
        });

        const formatted = {
          id: message._id.toString(),
          conversationId,
          senderId,
          content,
          timestamp: message.createdAt.toISOString(),
        };

        // Emit message to room
        io.to(conversationId).emit("receive_message", formatted);

        // Notify recipient if online but not in room
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit("new_message_alert", formatted);
        }
      } catch (error) {
        console.error("Socket send message error:", error.message);
      }
    });

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      let offlineUserId = null;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          offlineUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }
      console.log(`🔌 [SOCKET.IO] Socket disconnected: ${socket.id}`);
      if (offlineUserId) {
        io.emit("online_users", Array.from(onlineUsers.keys()));
      }
    });
  });
};
