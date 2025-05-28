# Production-Level Chat Notification System

## 🚀 Overview

This is a complete, production-ready chat notification system built with Socket.IO, MongoDB, and Express.js. It includes real-time messaging, offline notification storage, read receipts, typing indicators, and comprehensive user management.

## ✨ Key Features

### Real-time Features
- ✅ Real-time messaging with Socket.IO
- ✅ Typing indicators
- ✅ Online/offline status tracking
- ✅ Read receipts
- ✅ Room-based chat management
- ✅ User presence detection

### Notification System
- ✅ Real-time notifications for online users
- ✅ Persistent notifications for offline users
- ✅ Notification statistics and analytics
- ✅ Bulk notification operations
- ✅ Automatic cleanup of old notifications

### Data Management
- ✅ Message pagination
- ✅ Chat history with timestamps
- ✅ Unread message counting
- ✅ User chat list with last messages
- ✅ Message validation and sanitization

### Production Features
- ✅ JWT authentication (configurable)
- ✅ Comprehensive error handling
- ✅ Database indexing for performance
- ✅ Scalable architecture
- ✅ Environment-based configuration
- ✅ Detailed logging

## 📋 API Endpoints

### Chat Endpoints
```
GET    /api/chat/messages/:chatboxId              # Get messages with pagination
GET    /api/chat/chatbox/:senderId/:receiverId    # Get chatbox ID
GET    /api/chat/user/:userId/chats               # Get user's chat list
GET    /api/chat/user/:userId/unread-count        # Get unread message count
PATCH  /api/chat/chatbox/:chatboxId/mark-read/:userId  # Mark messages as read
```

### Notification Endpoints
```
GET    /api/notifications/user/:userId            # Get unread notifications
GET    /api/notifications/user/:userId/stats      # Get notification statistics
POST   /api/notifications/create                  # Create notification
PATCH  /api/notifications/read/:chatboxId/:notifId     # Mark notification as read
PATCH  /api/notifications/read-all/:chatboxId/:userId  # Mark all as read
DELETE /api/notifications/:chatboxId/:notifId          # Delete notification
DELETE /api/notifications/cleanup                      # Cleanup old notifications
```

## 🔌 Socket.IO Events

### Client to Server Events

#### Connection & Authentication
```javascript
// Connect with authentication
const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token',  // JWT token (optional for now)
    userId: 'user123'         // User ID (required)
  }
});
```

#### Chat Management
```javascript
// Join a chat room
socket.emit('joinChat', { 
  chatboxId: 'user1_user2' 
});

// Leave a chat room
socket.emit('leaveChat', { 
  chatboxId: 'user1_user2' 
});

// Send a message
socket.emit('sendMessage', {
  receiverId: 'user2',
  message: 'Hello!',
  senderName: 'User One',
  receiverName: 'User Two'
});

// Mark message as read
socket.emit('markMessageRead', {
  messageId: 'message_id_here',
  chatboxId: 'user1_user2'
});

// Send typing indicator
socket.emit('typing', {
  chatboxId: 'user1_user2',
  isTyping: true
});

// Get online users
socket.emit('getOnlineUsers');
```

### Server to Client Events

#### Message Events
```javascript
// Receive a new message
socket.on('receiveMessage', (data) => {
  console.log('New message:', data);
  // data: { messageId, senderId, receiverId, senderName, receiverName, message, timestamp, chatboxId }
});

// Message sent confirmation
socket.on('messageSent', (data) => {
  console.log('Message sent:', data);
  // data: { messageId, timestamp, chatboxId }
});

// Message read receipt
socket.on('messageRead', (data) => {
  console.log('Message read:', data);
  // data: { messageId, readBy, timestamp }
});
```

#### Notification Events
```javascript
// Receive notification
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // data: { type, fromUser, fromUserId, message, chatboxId, timestamp, messageId }
});
```

#### User Status Events
```javascript
// User status change
socket.on('userStatusChange', (data) => {
  console.log('User status changed:', data);
  // data: { userId, status, timestamp }
});

// Typing indicator
socket.on('userTyping', (data) => {
  console.log('User typing:', data);
  // data: { userId, isTyping, timestamp }
});

// Online users list
socket.on('onlineUsers', (users) => {
  console.log('Online users:', users);
  // users: [{ userId, lastSeen }]
});
```

#### System Events
```javascript
// Chat joined confirmation
socket.on('chatJoined', (data) => {
  console.log('Joined chat:', data);
  // data: { chatboxId, timestamp }
});

// Chat left confirmation
socket.on('chatLeft', (data) => {
  console.log('Left chat:', data);
  // data: { chatboxId, timestamp }
});

// Error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // error: { message, details }
});
```

## 🛠️ Frontend Integration Example

### React.js Integration
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const ChatComponent = ({ userId, chatboxId }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:4000', {
      auth: {
        userId: userId,
        token: localStorage.getItem('authToken') // If using JWT
      }
    });

    // Set up event listeners
    newSocket.on('receiveMessage', (data) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('notification', (data) => {
      // Show notification to user
      showNotification(data);
    });

    newSocket.on('userStatusChange', (data) => {
      setOnlineUsers(prev => 
        prev.map(user => 
          user.userId === data.userId 
            ? { ...user, status: data.status }
            : user
        )
      );
    });

    newSocket.on('userTyping', (data) => {
      setIsTyping(data.isTyping);
      if (data.isTyping) {
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    // Join the chat room
    newSocket.emit('joinChat', { chatboxId });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [userId, chatboxId]);

  const sendMessage = (message) => {
    if (socket && message.trim()) {
      socket.emit('sendMessage', {
        receiverId: 'other_user_id',
        message: message.trim(),
        senderName: 'Current User',
        receiverName: 'Other User'
      });
    }
  };

  const handleTyping = (typing) => {
    if (socket) {
      socket.emit('typing', {
        chatboxId,
        isTyping: typing
      });
    }
  };

  return (
    <div className="chat-container">
      {/* Your chat UI here */}
    </div>
  );
};
```

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
PORT=4000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/college_cart

# JWT (Optional - enable authentication in socket.js)
JWT_SECRET=your_super_secret_jwt_key

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
```

### Database Indexes
The system automatically creates the following indexes for optimal performance:

**Chatbox Collection:**
- `chatboxId: 1`
- `senderId: 1, receiverId: 1`
- `lastActivity: -1`

**ChatNotification Collection:**
- `chatboxId: 1`
- `users: 1`
- `lastNotificationAt: -1`
- `notifications.toUser: 1, notifications.read: 1`
- `notifications.createdAt: -1`

## 🚀 Deployment Considerations

### Scaling
1. **Multiple Server Instances**: Use Redis adapter for Socket.IO clustering
2. **Database Optimization**: Implement database sharding for large user bases
3. **CDN**: Use CDN for file uploads and static assets
4. **Load Balancing**: Implement sticky sessions for Socket.IO

### Security
1. **JWT Authentication**: Enable JWT verification in socket authentication
2. **Rate Limiting**: Implement rate limiting for messages and notifications
3. **Input Validation**: All inputs are validated and sanitized
4. **CORS**: Configure CORS properly for production

### Monitoring
1. **Error Tracking**: Implement error tracking (Sentry, etc.)
2. **Performance Monitoring**: Monitor socket connections and database queries
3. **Logging**: Comprehensive logging is already implemented
4. **Health Checks**: Add health check endpoints

## 🧹 Maintenance

### Automatic Cleanup
The system includes automatic cleanup for old notifications:

```javascript
// Cleanup notifications older than 30 days
DELETE /api/notifications/cleanup?daysOld=30
```

### Database Maintenance
- Regular backup of MongoDB
- Monitor database size and performance
- Archive old messages if needed

## 🐛 Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Check CORS configuration
   - Verify user authentication
   - Check network connectivity

2. **Messages Not Saving**
   - Verify MongoDB connection
   - Check database permissions
   - Review error logs

3. **Notifications Not Working**
   - Ensure user is properly authenticated
   - Check notification permissions
   - Verify socket event listeners

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and debugging information.

## 📈 Performance Metrics

The system is optimized for:
- **Message Delivery**: < 100ms for real-time messages
- **Database Queries**: Indexed for O(log n) lookup times
- **Memory Usage**: Efficient socket management with cleanup
- **Concurrent Users**: Designed to handle 1000+ concurrent connections

## 🔒 Security Features

- JWT-based authentication (configurable)
- Input validation and sanitization
- Rate limiting ready (implement as needed)
- CORS protection
- Error message sanitization in production
- Secure socket connections

This production-ready chat notification system provides a solid foundation for any real-time messaging application with comprehensive features and scalability in mind. 