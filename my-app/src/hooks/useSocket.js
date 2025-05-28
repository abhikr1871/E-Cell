import { useEffect, useState } from 'react';
import socketManager from '../services/socket';
import api from '../services/api';
import { getUserId } from '../context/Authcontext';

const useSocket = () => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const userId = getUserId() || localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    
    if (!userId) {
      console.warn('⚠️ No user ID found, cannot initialize socket');
      return;
    }

    // Connect socket with authentication
    const socket = socketManager.connect(userId, token);
    
    if (!socket) {
      console.error('❌ Failed to connect socket');
      return;
    }

    // Fetch stored notifications from MongoDB
    const fetchStoredNotifications = async () => {
      try {
        const stored = await api.getNotifications(userId);
        setNotifications(stored || []);
        console.log('📥 Loaded stored notifications:', stored?.length || 0);
      } catch (error) {
        console.error('❌ Failed to fetch stored notifications:', error);
      }
    };

    fetchStoredNotifications();

    // Handle socket connection status
    const handleConnect = () => {
      setIsConnected(true);
      console.log('✅ Socket connected in useSocket');
      
      // Request online users when connected
      socketManager.getOnlineUsers();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('❌ Socket disconnected in useSocket');
    };

    // Handle real-time notifications
    const handleNotification = (notif) => {
      console.log('🔔 Received real-time notification:', notif);
      setNotifications((prev) => {
        // Avoid duplicates
        const exists = prev.some(n => n._id === notif._id || 
          (n.messageId && n.messageId === notif.messageId));
        if (exists) return prev;
        
        return [...prev, notif];
      });
    };

    // Handle online users updates
    const handleOnlineUsers = (users) => {
      console.log('👥 Online users updated:', users);
      setOnlineUsers(users);
    };

    // Handle user status changes
    const handleUserStatusChange = (statusUpdate) => {
      console.log('📊 User status changed:', statusUpdate);
      setOnlineUsers(prev => {
        if (statusUpdate.status === 'online') {
          // Add user if not already online
          const exists = prev.some(user => user.userId === statusUpdate.userId);
          if (!exists) {
            return [...prev, { 
              userId: statusUpdate.userId, 
              lastSeen: statusUpdate.timestamp 
            }];
          }
        } else {
          // Remove user from online list
          return prev.filter(user => user.userId !== statusUpdate.userId);
        }
        return prev;
      });
    };

    // Handle socket errors
    const handleError = (error) => {
      console.error('❌ Socket error in useSocket:', error);
    };

    // Set up event listeners
    socketManager.on('connect', handleConnect);
    socketManager.on('disconnect', handleDisconnect);
    socketManager.on('notification', handleNotification);
    socketManager.on('onlineUsers', handleOnlineUsers);
    socketManager.on('userStatusChange', handleUserStatusChange);
    socketManager.on('error', handleError);

    // Cleanup function
    return () => {
      socketManager.off('connect', handleConnect);
      socketManager.off('disconnect', handleDisconnect);
      socketManager.off('notification', handleNotification);
      socketManager.off('onlineUsers', handleOnlineUsers);
      socketManager.off('userStatusChange', handleUserStatusChange);
      socketManager.off('error', handleError);
    };
  }, []);

  // Function to remove notification from local state
  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  // Function to mark notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      await api.markNotificationAsRead(notificationId);
      removeNotification(notificationId);
      console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  };

  return {
    notifications,
    isConnected,
    onlineUsers,
    removeNotification,
    markNotificationRead
  };
};

export default useSocket;
