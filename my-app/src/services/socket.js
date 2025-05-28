import createSocket from '../socket.js';

class SocketManager {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  // Initialize socket connection with user authentication
  connect(userId, token) {
    if (this.socket && this.socket.connected && this.userId === userId) {
      console.log('✅ Socket already connected for user:', userId);
      return this.socket;
    }

    // Disconnect existing socket if different user
    if (this.socket && this.userId !== userId) {
      this.disconnect();
    }

    this.userId = userId;
    this.socket = createSocket(userId, token);
    
    if (!this.socket) {
      console.error('❌ Failed to create socket');
      return null;
    }

    // Set up event listeners
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`✅ Socket connected for user ${userId}`);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log(`❌ Socket disconnected for user ${userId}`);
    });

    // Connect the socket
    this.socket.connect();
    
    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.isConnected = false;
      this.eventListeners.clear();
      console.log('🔌 Socket disconnected');
    }
  }

  // Get current socket instance
  getSocket() {
    return this.socket;
  }

  // Check if socket is connected
  isSocketConnected() {
    return this.socket && this.socket.connected;
  }

  // Join a chat room
  joinChat(chatboxId) {
    if (this.isSocketConnected()) {
      this.socket.emit('joinChat', { chatboxId });
      console.log(`🏠 Joined chat room: ${chatboxId}`);
    }
  }

  // Leave a chat room
  leaveChat(chatboxId) {
    if (this.isSocketConnected()) {
      this.socket.emit('leaveChat', { chatboxId });
      console.log(`🚪 Left chat room: ${chatboxId}`);
    }
  }

  // Send a message
  sendMessage(messageData) {
    if (this.isSocketConnected()) {
      this.socket.emit('sendMessage', messageData);
      console.log('📤 Message sent:', messageData);
    }
  }

  // Mark message as read
  markMessageAsRead(messageId, chatboxId) {
    if (this.isSocketConnected()) {
      this.socket.emit('markMessageRead', { messageId, chatboxId });
      console.log(`👀 Marked message as read: ${messageId}`);
    }
  }

  // Send typing indicator
  sendTypingIndicator(chatboxId, isTyping) {
    if (this.isSocketConnected()) {
      this.socket.emit('typing', { chatboxId, isTyping });
    }
  }

  // Get online users
  getOnlineUsers() {
    if (this.isSocketConnected()) {
      this.socket.emit('getOnlineUsers');
    }
  }

  // Add event listener
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.eventListeners.has(event)) {
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.eventListeners.delete(event);
    }
  }
}

// Create a singleton instance
const socketManager = new SocketManager();

export default socketManager;
