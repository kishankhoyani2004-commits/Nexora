import Notification from "../models/Notification.js";

export const userRoom = (userId) => `user-${userId}`;

// Creates a persisted notification and — if a live socket is passed in —
// pushes it instantly to that user's personal room. Never throws: a
// notification failure must never break the action that triggered it
// (sending a message, uploading a file, etc.).
export const notifyUser = async ({ io, recipient, title, message, type = "general", link = "" }) => {
  try {
    if (!recipient) return null;
    const notification = await Notification.create({ recipient, title, message, type, link });
    if (io) {
      io.to(userRoom(recipient.toString())).emit("notification:new", notification);
    }
    return notification;
  } catch {
    return null;
  }
};
