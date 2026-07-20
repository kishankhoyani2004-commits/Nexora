import Notification from "../models/Notification.js";

export const list = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    if (notification.recipient.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    next(error);
  }
};
