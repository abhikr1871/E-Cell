const ChatNotification = require("../model");
const mongoose = require("mongoose");

/**
 * Creates and stores a notification in the ChatNotification model.
 * @param {Object} params
 * @param {String} params.toUser - Recipient user ID.
 * @param {String} params.fromUser - Sender user ID.
 * @param {String} params.message - Notification message.
 * @param {String} params.chatboxId - Chatbox ID (should be generated consistently).
 * @param {String} [params.type='chat'] - Notification type.
 * @param {Date} [params.createdAt=new Date()] - Optional creation timestamp.
 * @param {Boolean} [params.read=false] - Read status.
 * @param {Object} [params.metadata={}] - Additional metadata.
 * @returns {Promise<Object|null>} - The new notification.
 */
const sendNotification = async ({ 
  toUser, 
  fromUser, 
  message, 
  chatboxId, 
  type = 'chat',
  createdAt = new Date(), 
  read = false,
  metadata = {}
}) => {
  try {
    // Validate required parameters
    if (!toUser || !fromUser || !message || !chatboxId) {
      throw new Error('Missing required parameters: toUser, fromUser, message, chatboxId');
    }

    const notifId = new mongoose.Types.ObjectId().toString();
    const newNotification = {
      notifId,
      toUser,
      fromUser,
      message,
      type,
      read,
      createdAt,
      metadata
    };

    const updated = await ChatNotification.findOneAndUpdate(
      { chatboxId },
      {
        $setOnInsert: { 
          users: [toUser, fromUser],
          createdAt: new Date()
        },
        $push: { notifications: newNotification },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Notification sent successfully: ${notifId}`);
    return newNotification;
  } catch (err) {
    console.error("❌ Error sending notification:", err);
    throw err; // Re-throw to allow caller to handle
  }
};

/**
 * Mark a notification as read
 */
const markNotificationAsRead = async (notifId, chatboxId) => {
  try {
    const result = await ChatNotification.findOneAndUpdate(
      { chatboxId, "notifications.notifId": notifId },
      { 
        $set: { 
          "notifications.$.read": true,
          "notifications.$.readAt": new Date()
        }
      },
      { new: true }
    );

    if (!result) {
      throw new Error('Notification not found');
    }

    console.log(`✅ Notification marked as read: ${notifId}`);
    return result;
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    throw err;
  }
};

/**
 * Get all unread notifications for a user
 */
const getUnreadNotifications = async (userId) => {
  try {
    const notifications = await ChatNotification.find({ users: userId })
      .select("chatboxId notifications")
      .lean();

    const unread = notifications.flatMap(chat =>
      chat.notifications
        .filter(n => n.toUser === userId && !n.read)
        .map(n => ({
          ...n,
          chatboxId: chat.chatboxId
        }))
    );

    return unread;
  } catch (err) {
    console.error("❌ Error getting unread notifications:", err);
    throw err;
  }
};

/**
 * Delete old notifications (cleanup utility)
 */
const cleanupOldNotifications = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await ChatNotification.updateMany(
      {},
      {
        $pull: {
          notifications: {
            createdAt: { $lt: cutoffDate }
          }
        }
      }
    );

    console.log(`🧹 Cleaned up old notifications: ${result.modifiedCount} documents updated`);
    return result;
  } catch (err) {
    console.error("❌ Error cleaning up notifications:", err);
    throw err;
  }
};

module.exports = {
  sendNotification,
  markNotificationAsRead,
  getUnreadNotifications,
  cleanupOldNotifications
};
