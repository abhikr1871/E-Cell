const ChatNotification = require("./model");
const { 
  sendNotification, 
  markNotificationAsRead, 
  getUnreadNotifications,
  cleanupOldNotifications 
} = require("./utils/sendNotification");
const mongoose = require("mongoose");

/**
 * Helper to generate a consistent chatbox ID for notifications.
 * Ensures that the order of sender and receiver does not affect the chatboxId.
 */
function generateChatboxId(senderId, receiverId) {
  return [senderId, receiverId].sort().join("_");
}

/**
 * Create a notification endpoint.
 * Expects req.body to include: toUser, fromUser, senderId, receiverId, message, and optionally createdAt.
 */
exports.createNotification = async (req, res) => {
  try {
    const { toUser, fromUser, senderId, receiverId, message, type, createdAt, metadata } = req.body;
    
    // Validate required fields
    if (!toUser || !fromUser || !message) {
      return res.status(400).json({ 
        message: "Missing required fields: toUser, fromUser, message" 
      });
    }

    const chatboxId = generateChatboxId(senderId || fromUser, receiverId || toUser);

    // Save notification to MongoDB via the utility function.
    const notif = await sendNotification({ 
      toUser, 
      fromUser, 
      message, 
      chatboxId, 
      type,
      createdAt,
      metadata
    });

    res.status(201).json({
      success: true,
      notification: notif,
      message: "Notification created successfully"
    });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to save notification",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Get unread notifications for a specific user.
 * Uses the utility function for better performance.
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const unreadNotifications = await getUnreadNotifications(userId);

    res.status(200).json({
      success: true,
      notifications: unreadNotifications,
      count: unreadNotifications.length
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch notifications",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Mark a specific notification as read.
 * Expects chatboxId and notifId as URL parameters.
 */
exports.markAsRead = async (req, res) => {
  try {
    const { chatboxId, notifId } = req.params;

    if (!chatboxId || !notifId) {
      return res.status(400).json({ message: "Chatbox ID and Notification ID are required" });
    }

    const updated = await markNotificationAsRead(notifId, chatboxId);

    res.status(200).json({ 
      success: true,
      message: "Notification marked as read", 
      notification: updated 
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    
    if (err.message === 'Notification not found') {
      return res.status(404).json({ 
        success: false,
        message: "Notification not found" 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Failed to mark notification as read",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Mark all notifications as read for a user in a specific chatbox
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const { chatboxId, userId } = req.params;

    if (!chatboxId || !userId) {
      return res.status(400).json({ message: "Chatbox ID and User ID are required" });
    }

    const result = await ChatNotification.findOneAndUpdate(
      { chatboxId },
      { 
        $set: { 
          "notifications.$[elem].read": true,
          "notifications.$[elem].readAt": new Date()
        }
      },
      {
        arrayFilters: [{ "elem.toUser": userId, "elem.read": false }],
        new: true
      }
    );

    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: "Chatbox not found" 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "All notifications marked as read"
    });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to mark all notifications as read",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Delete a specific notification.
 * Expects chatboxId and notifId as URL parameters.
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { chatboxId, notifId } = req.params;

    if (!chatboxId || !notifId) {
      return res.status(400).json({ message: "Chatbox ID and Notification ID are required" });
    }

    const updated = await ChatNotification.findOneAndUpdate(
      { chatboxId },
      { $pull: { notifications: { notifId } } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ 
        success: false,
        message: "Notification or chat not found" 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "Notification deleted successfully" 
    });
  } catch (error) {
    console.error(`Error deleting notification:`, error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete notification",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notification statistics for a user
 */
exports.getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const notifications = await ChatNotification.find({ users: userId }).lean();

    let totalNotifications = 0;
    let unreadCount = 0;
    let chatboxCount = notifications.length;

    notifications.forEach(chat => {
      const userNotifications = chat.notifications.filter(n => n.toUser === userId);
      totalNotifications += userNotifications.length;
      unreadCount += userNotifications.filter(n => !n.read).length;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalNotifications,
        unreadCount,
        readCount: totalNotifications - unreadCount,
        activeChatboxes: chatboxCount
      }
    });
  } catch (err) {
    console.error("Error getting notification stats:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to get notification statistics",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Cleanup old notifications (admin endpoint)
 */
exports.cleanupNotifications = async (req, res) => {
  try {
    const { daysOld = 30 } = req.query;
    
    const result = await cleanupOldNotifications(parseInt(daysOld));
    
    res.status(200).json({
      success: true,
      message: `Cleaned up notifications older than ${daysOld} days`,
      result
    });
  } catch (err) {
    console.error("Error cleaning up notifications:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to cleanup notifications",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
