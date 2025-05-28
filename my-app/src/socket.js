import { io } from 'socket.io-client';

// This socket configuration matches the backend socket implementation
const createSocket = (userId, token) => {
  if (!userId) {
    console.warn('⚠️ Cannot create socket connection: userId is required');
    return null;
  }

  const socket = io('http://localhost:4000', {
    auth: {
      token: token || localStorage.getItem('token'),
      userId: userId
    },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: false, // Don't auto-connect, we'll connect manually when needed
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
  });

  // Handle connection events
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  return socket;
};

export default createSocket;
