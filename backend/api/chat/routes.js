const express = require('express');
const router = express.Router();
const { 
  getMessages, 
  getChatboxId, 
  getUserChats,
  markAllMessagesAsRead,
  getUnreadMessageCount
} = require('./controller');

// ✅ Fetch chat messages by chatbox ID with pagination
router.get('/messages/:chatboxId', getMessages);

// ✅ Generate consistent chatbox ID for a user pair
router.get('/chatbox/:senderId/:receiverId', getChatboxId);

// ✅ Get user's chat list with last messages and unread counts
router.get('/user/:userId/chats', getUserChats);

// ✅ Get unread message count for a user
router.get('/user/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    const { getUnreadMessageCount } = require('./controller');
    const count = await getUnreadMessageCount(userId);
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error("❌ Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

// ✅ Mark all messages in a chatbox as read
router.patch('/chatbox/:chatboxId/mark-read/:userId', async (req, res) => {
  try {
    const { chatboxId, userId } = req.params;
    await markAllMessagesAsRead(chatboxId, userId);
    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

module.exports = router;
