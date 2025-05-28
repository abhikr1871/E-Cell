const Chatbox = require('./model'); // Chatbox schema
const { sendNotification } = require('../notification/utils/sendNotification');

const saveMessage = async ({ senderId, receiverId, message, senderName, receiverName }) => {
  console.log('🛠️ saveMessage called with:', { senderId, receiverId, message, senderName, receiverName });

  try {
    const chatboxId = [senderId, receiverId].sort().join('_');
    let chatbox = await Chatbox.findOne({ chatboxId });

    if (!chatbox) {
      chatbox = new Chatbox({
        chatboxId,
        senderId,
        receiverId,
        messages: []
      });
      console.log(`🆕 Created new chatbox: ${chatboxId}`);
    }

    const newMessage = {
      message,
      senderName,
      receiverName,
      timestamp: new Date(),
      read: false
    };

    chatbox.messages.push(newMessage);
    await chatbox.save();

    console.log(`💬 Message saved to chatbox: ${chatboxId}`);

    // Don't send notification here - let the socket handler manage it
    // This prevents duplicate notifications

    return chatbox;
  } catch (error) {
    console.error('❌ Error saving message:', error);
    throw error;
  }
};

// Mark a specific message as read
const markMessageAsRead = async (messageId, userId) => {
  try {
    const result = await Chatbox.updateOne(
      { "messages._id": messageId },
      { 
        $set: { 
          "messages.$.read": true,
          "messages.$.readAt": new Date(),
          "messages.$.readBy": userId
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Message not found or already read');
    }

    console.log(`✅ Message ${messageId} marked as read by ${userId}`);
    return result;
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    throw error;
  }
};

// Mark all messages in a chatbox as read by a specific user
const markAllMessagesAsRead = async (chatboxId, userId) => {
  try {
    const result = await Chatbox.updateOne(
      { chatboxId },
      { 
        $set: { 
          "messages.$[elem].read": true,
          "messages.$[elem].readAt": new Date(),
          "messages.$[elem].readBy": userId
        }
      },
      {
        arrayFilters: [{ "elem.read": false, "elem.senderName": { $ne: userId } }]
      }
    );

    console.log(`✅ All messages in ${chatboxId} marked as read by ${userId}`);
    return result;
  } catch (error) {
    console.error('❌ Error marking all messages as read:', error);
    throw error;
  }
};

// Update user online/offline status (you might want to create a separate User model for this)
const updateUserStatus = async (userId, status) => {
  try {
    // For now, we'll just log this. In production, you should update a User model
    console.log(`📊 User ${userId} status updated to: ${status}`);
    
    // If you have a User model, uncomment and update this:
    // const User = require('../users/model');
    // await User.findByIdAndUpdate(userId, { 
    //   status, 
    //   lastSeen: new Date() 
    // });
    
    return { userId, status, timestamp: new Date() };
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    throw error;
  }
};

// Get unread message count for a user
const getUnreadMessageCount = async (userId) => {
  try {
    const chatboxes = await Chatbox.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    });

    let unreadCount = 0;
    chatboxes.forEach(chatbox => {
      chatbox.messages.forEach(message => {
        // Count messages sent to this user that are unread
        if ((message.senderName !== userId && !message.read) ||
            (chatbox.receiverId === userId && message.senderName !== userId && !message.read)) {
          unreadCount++;
        }
      });
    });

    return unreadCount;
  } catch (error) {
    console.error('❌ Error getting unread message count:', error);
    throw error;
  }
};

// Get chat history with pagination
const getChatHistory = async (chatboxId, page = 1, limit = 50) => {
  try {
    const chatbox = await Chatbox.findOne({ chatboxId });
    
    if (!chatbox) {
      return { messages: [], totalPages: 0, currentPage: page };
    }

    const totalMessages = chatbox.messages.length;
    const totalPages = Math.ceil(totalMessages / limit);
    const startIndex = Math.max(0, totalMessages - (page * limit));
    const endIndex = Math.max(0, totalMessages - ((page - 1) * limit));
    
    // Get messages in reverse order (newest first for pagination)
    const messages = chatbox.messages
      .slice(startIndex, endIndex)
      .reverse();

    return {
      messages,
      totalPages,
      currentPage: page,
      totalMessages,
      hasMore: page < totalPages
    };
  } catch (error) {
    console.error('❌ Error getting chat history:', error);
    throw error;
  }
};

const getMessages = async (req, res) => {
  const { chatboxId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  try {
    const result = await getChatHistory(chatboxId, parseInt(page), parseInt(limit));
    res.status(200).json(result);
  } catch (error) {
    console.error("🔥 Error fetching messages:", error);
    res.status(500).json({ message: "Failed to retrieve messages" });
  }
};

const getChatboxId = async (req, res) => {
  const { senderId, receiverId } = req.params;

  if (!senderId || !receiverId) {
    return res.status(400).json({ message: "senderId and receiverId are required." });
  }

  try {
    const chatboxId = [senderId, receiverId].sort().join('_');
    res.status(200).json({ chatboxId });
  } catch (error) {
    console.error("❌ Error fetching chatboxId:", error);
    res.status(500).json({ message: "Failed to fetch chatboxId" });
  }
};

// Get user's chat list with last message and unread count
const getUserChats = async (req, res) => {
  const { userId } = req.params;

  try {
    const chatboxes = await Chatbox.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ 'messages.timestamp': -1 });

    const chats = chatboxes.map(chatbox => {
      const lastMessage = chatbox.messages[chatbox.messages.length - 1];
      const unreadCount = chatbox.messages.filter(msg => 
        !msg.read && msg.senderName !== userId
      ).length;

      const otherUserId = chatbox.senderId === userId ? chatbox.receiverId : chatbox.senderId;

      return {
        chatboxId: chatbox.chatboxId,
        otherUserId,
        lastMessage: lastMessage ? {
          message: lastMessage.message,
          timestamp: lastMessage.timestamp,
          senderName: lastMessage.senderName
        } : null,
        unreadCount
      };
    });

    res.status(200).json({ chats });
  } catch (error) {
    console.error("❌ Error fetching user chats:", error);
    res.status(500).json({ message: "Failed to fetch user chats" });
  }
};

module.exports = {
  saveMessage,
  markMessageAsRead,
  markAllMessagesAsRead,
  updateUserStatus,
  getUnreadMessageCount,
  getChatHistory,
  getMessages,
  getChatboxId,
  getUserChats
};
