const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getNotificationStats,
  cleanupNotifications
} = require("./controller");

// Get unread notifications for a user
router.get("/user/:userId", getNotifications);

// Get notification statistics for a user
router.get("/user/:userId/stats", getNotificationStats);

// Create a new notification
router.post("/create", createNotification);

// Mark a specific notification as read
router.patch("/read/:chatboxId/:notifId", markAsRead);

// Mark all notifications as read for a user in a chatbox
router.patch("/read-all/:chatboxId/:userId", markAllAsRead);

// Delete a specific notification
router.delete("/:chatboxId/:notifId", deleteNotification);

// Cleanup old notifications (admin endpoint)
router.delete("/cleanup", cleanupNotifications);

module.exports = router;
