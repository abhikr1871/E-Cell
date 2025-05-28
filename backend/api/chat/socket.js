const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { saveMessage, markMessageAsRead, updateUserStatus } = require('./controller');
const { sendNotification } = require('../notification/utils/sendNotification');

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

class ChatNotificationManager {
  constructor() {
    this.userSocketMap = new Map(); // userId -> { socketId, status, lastSeen }
    this.socketUserMap = new Map(); // socketId -> userId
    this.userRooms = new Map(); // userId -> Set of room names
  }

  // Add user to online users
  addUser(userId, socketId) {
    this.userSocketMap.set(userId.toString(), {
      socketId,
      status: 'online',
      lastSeen: new Date()
    });
    this.socketUserMap.set(socketId, userId.toString());
    console.log(`✅ User ${userId} is now online with socket ${socketId}`);
  }

  // Remove user from online users
  removeUser(socketId) {
    const userId = this.socketUserMap.get(socketId);
    if (userId) {
      const userInfo = this.userSocketMap.get(userId);
      if (userInfo) {
        this.userSocketMap.set(userId, {
          ...userInfo,
          status: 'offline',
          lastSeen: new Date()
        });
      }
      this.socketUserMap.delete(socketId);
      
      // Clean up user rooms
      if (this.userRooms.has(userId)) {
        this.userRooms.delete(userId);
      }
      
      console.log(`❌ User ${userId} is now offline`);
      return userId;
    }
    return null;
  }

  // Get user's socket info
  getUserSocket(userId) {
    return this.userSocketMap.get(userId.toString());
  }

  // Check if user is online
  isUserOnline(userId) {
    const userInfo = this.userSocketMap.get(userId.toString());
    return userInfo && userInfo.status === 'online';
  }

  // Join user to a chat room
  joinChatRoom(userId, chatboxId, socket) {
    const roomName = `chat_${chatboxId}`;
    socket.join(roomName);
    
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomName);
    
    console.log(`🏠 User ${userId} joined room ${roomName}`);
  }

  // Leave chat room
  leaveChatRoom(userId, chatboxId, socket) {
    const roomName = `chat_${chatboxId}`;
    socket.leave(roomName);
    
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).delete(roomName);
    }
    
    console.log(`🚪 User ${userId} left room ${roomName}`);
  }

  // Get all online users
  getOnlineUsers() {
    const onlineUsers = [];
    for (const [userId, userInfo] of this.userSocketMap) {
      if (userInfo.status === 'online') {
        onlineUsers.push({
          userId,
          lastSeen: userInfo.lastSeen
        });
      }
    }
    return onlineUsers;
  }
}

function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  const chatManager = new ChatNotificationManager();

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token (uncomment when you have JWT_SECRET in env)
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // socket.userId = decoded.userId;
      
      // For now, accept userId from client (replace this in production)
      socket.userId = socket.handshake.auth.userId;
      
      if (!socket.userId) {
        return next(new Error('User ID required'));
      }
      
      next();
    } catch (err) {
      console.error('❌ Socket authentication error:', err);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.userId} connected via ${socket.conn.transport.name}, Socket ID: ${socket.id}`);
    
    // Add user to online users
    chatManager.addUser(socket.userId, socket.id);

    // Update user status in database
    updateUserStatus(socket.userId, 'online').catch(err => 
      console.error('❌ Error updating user status:', err)
    );

    // Broadcast user online status to relevant users
    socket.broadcast.emit('userStatusChange', {
      userId: socket.userId,
      status: 'online',
      timestamp: new Date()
    });

    // Handle user joining a specific chat
    socket.on('joinChat', ({ chatboxId }) => {
      try {
        if (!chatboxId) {
          socket.emit('error', { message: 'Chatbox ID is required' });
          return;
        }
        
        chatManager.joinChatRoom(socket.userId, chatboxId, socket);
        socket.emit('chatJoined', { chatboxId, timestamp: new Date() });
      } catch (error) {
        console.error('❌ Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle leaving a chat
    socket.on('leaveChat', ({ chatboxId }) => {
      try {
        if (!chatboxId) {
          socket.emit('error', { message: 'Chatbox ID is required' });
          return;
        }
        
        chatManager.leaveChatRoom(socket.userId, chatboxId, socket);
        socket.emit('chatLeft', { chatboxId, timestamp: new Date() });
      } catch (error) {
        console.error('❌ Error leaving chat:', error);
        socket.emit('error', { message: 'Failed to leave chat' });
      }
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
      try {
        const { receiverId, message, senderName, receiverName } = data;
        const senderId = socket.userId;

        // Validate input
        if (!receiverId || !message || !senderName || !receiverName) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        if (message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (message.length > 1000) {
          socket.emit('error', { message: 'Message too long (max 1000 characters)' });
          return;
        }

        console.log('📨 Processing message:', { senderId, receiverId, message: message.substring(0, 50) + '...' });

        // Save message to database
        const chatbox = await saveMessage({ 
          senderId, 
          receiverId, 
          message: message.trim(), 
          senderName, 
          receiverName 
        });

        const chatboxId = [senderId, receiverId].sort().join('_');
        const roomName = `chat_${chatboxId}`;
        const lastMessage = chatbox.messages[chatbox.messages.length - 1];

        // Emit to the chat room (both users if they're in the room)
        io.to(roomName).emit('receiveMessage', {
          messageId: lastMessage._id,
          senderId,
          receiverId,
          senderName,
          receiverName,
          message: lastMessage.message,
          timestamp: lastMessage.timestamp,
          chatboxId
        });

        // Check if receiver is online
        const receiverSocket = chatManager.getUserSocket(receiverId);
        
        if (receiverSocket && receiverSocket.status === 'online') {
          // Send real-time notification to online receiver
          io.to(receiverSocket.socketId).emit('notification', {
            type: 'chat',
            fromUser: senderName,
            fromUserId: senderId,
            message: lastMessage.message,
            chatboxId,
            timestamp: lastMessage.timestamp,
            messageId: lastMessage._id
          });

          console.log(`🔔 Real-time notification sent to online user ${receiverId}`);
        } else {
          console.log(`📱 User ${receiverId} is offline, notification will be stored for later`);
        }

        // Always store notification in database for persistence
        await sendNotification({
          toUser: receiverId,
          fromUser: senderId,
          message: `New message from ${senderName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
          chatboxId
        });

        // Confirm message sent to sender
        socket.emit('messageSent', {
          messageId: lastMessage._id,
          timestamp: lastMessage.timestamp,
          chatboxId
        });

      } catch (error) {
        console.error('❌ Error processing message:', error);
        socket.emit('error', { 
          message: 'Failed to send message',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // Handle message read receipts
    socket.on('markMessageRead', async ({ messageId, chatboxId }) => {
      try {
        if (!messageId || !chatboxId) {
          socket.emit('error', { message: 'Message ID and Chatbox ID are required' });
          return;
        }

        await markMessageAsRead(messageId, socket.userId);
        
        // Notify the sender that message was read
        const roomName = `chat_${chatboxId}`;
        socket.to(roomName).emit('messageRead', {
          messageId,
          readBy: socket.userId,
          timestamp: new Date()
        });

        console.log(`👀 Message ${messageId} marked as read by ${socket.userId}`);
      } catch (error) {
        console.error('❌ Error marking message as read:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ chatboxId, isTyping }) => {
      try {
        if (!chatboxId) return;
        
        const roomName = `chat_${chatboxId}`;
        socket.to(roomName).emit('userTyping', {
          userId: socket.userId,
          isTyping,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('❌ Error handling typing indicator:', error);
      }
    });

    // Get online users
    socket.on('getOnlineUsers', () => {
      try {
        const onlineUsers = chatManager.getOnlineUsers();
        socket.emit('onlineUsers', onlineUsers);
      } catch (error) {
        console.error('❌ Error getting online users:', error);
        socket.emit('error', { message: 'Failed to get online users' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`❌ User ${socket.userId} disconnected. Reason: ${reason}`);
      
      try {
        const userId = chatManager.removeUser(socket.id);
        
        if (userId) {
          // Update user status in database
          await updateUserStatus(userId, 'offline');
          
          // Broadcast user offline status
          socket.broadcast.emit('userStatusChange', {
            userId,
            status: 'offline',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('❌ Error handling disconnection:', error);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${socket.userId}:`, error);
    });
  });

  // Handle server-level errors
  io.engine.on('connection_error', (err) => {
    console.error('❌ Connection error:', err.req, err.code, err.message, err.context);
  });

  return io;
}

module.exports = setupWebSocket;
