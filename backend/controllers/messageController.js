import Message from "../models/Message.js";
import User from "../models/User.js";

export const listConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all messages involving the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "fullName avatar")
      .populate("recipient", "fullName avatar");

    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const isSender = msg.sender._id.toString() === userId.toString();
      const partner = isSender ? msg.recipient : msg.sender;
      const conversationId = msg.conversationId;

      if (!conversationsMap.has(conversationId)) {
        conversationsMap.set(conversationId, {
          id: conversationId,
          partnerName: partner.fullName,
          partnerAvatar: partner.avatar,
          partnerId: partner._id,
          lastMessage: msg.content,
          timestamp: msg.createdAt.toISOString(),
          unreadCount: !msg.read && !isSender ? 1 : 0,
        });
      } else {
        const conversation = conversationsMap.get(conversationId);
        if (!msg.read && !isSender) {
          conversation.unreadCount += 1;
        }
      }
    });

    const conversations = Array.from(conversationsMap.values());
    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
};

export const listMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate("sender", "fullName avatar")
      .populate("recipient", "fullName avatar");

    // Mark messages as read
    await Message.updateMany(
      { conversationId, recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId,
      senderId: m.sender._id.toString(),
      senderName: m.sender.fullName,
      senderAvatar: m.sender.avatar,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
    }));

    res.status(200).json({ success: true, data: formattedMessages });
  } catch (error) {
    next(error);
  }
};

export const send = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    // Prefer deriving the recipient from an existing message in this thread —
    // conversationId isn't always a plain "userIdA-userIdB" pair (project
    // workspace chat uses "workspace-<contractId>", see sockets/chatSocket.js),
    // so parsing the string is only safe as a fallback for a brand-new
    // conversation that has no messages yet.
    const priorMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
    let recipientId;
    let contractId = null;
    if (priorMessage) {
      recipientId =
        priorMessage.sender.toString() === req.user.id
          ? priorMessage.recipient.toString()
          : priorMessage.sender.toString();
      contractId = priorMessage.contract;
    } else {
      const ids = conversationId.split("-");
      recipientId = ids.find((id) => id !== req.user.id);
    }

    if (!recipientId) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID format." });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      contract: contractId,
      conversationId,
      content,
      read: false,
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "fullName avatar")
      .populate("recipient", "fullName avatar");

    const formatted = {
      id: populated._id.toString(),
      conversationId: populated.conversationId,
      senderId: populated.sender._id.toString(),
      senderName: populated.sender.fullName,
      senderAvatar: populated.sender.avatar,
      content: populated.content,
      timestamp: populated.createdAt.toISOString(),
    };

    res.status(201).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};
