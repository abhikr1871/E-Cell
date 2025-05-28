import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Notification from './components/Notification.js';
import useSocket from './hooks/useSocket.js';

import Home from "./components/pages/Home.js";
import Login from "./components/pages/Login.js";
import Signup from "./components/pages/Signup.js";
import Buy from "./components/pages/Buy.js";
import Sell from "./components/pages/Sell.js";
import PrivateRoute from "./components/privateRoute.js";
import Profile from './components/pages/Profile.js';
import Chat from './components/Chat.js';
import { deleteNotification } from './services/api.js';

function App() {
  const [chatDetails, setChatDetails] = useState(null);
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  const { 
    notifications: socketNotifications, 
    isConnected, 
    onlineUsers, 
    removeNotification,
    markNotificationRead 
  } = useSocket();
  
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  // Listen for custom openChat events from Card components
  useEffect(() => {
    const handleOpenChat = (event) => {
      const { sellerId, sellerName, chatboxId } = event.detail;
      
      // Don't open if same chat is already open
      if (chatDetails && chatDetails.chatboxId === chatboxId) {
        console.log("✅ Chat already open for this user.");
        return;
      }

      setChatDetails({
        sellerId,
        sellerName,
        chatboxId
      });
    };

    window.addEventListener('openChat', handleOpenChat);
    
    return () => {
      window.removeEventListener('openChat', handleOpenChat);
    };
  }, [chatDetails]);

  // Show connection status
  useEffect(() => {
    if (userId) {
      if (isConnected) {
        toast.success('📡 Connected to chat server', {
          position: "bottom-right",
          autoClose: 2000,
          hideProgressBar: true,
        });
      } else {
        toast.error('📡 Disconnected from chat server', {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: true,
        });
      }
    }
  }, [isConnected, userId]);

  // Merge new socket notifications into visibleNotifications
  useEffect(() => {
    if (socketNotifications.length > 0) {
      setVisibleNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n._id));
        const newOnes = socketNotifications.filter((n) => !existingIds.has(n._id));
        
        // Show toast for new notifications
        newOnes.forEach(notif => {
          if (notif.type === 'chat') {
            toast.info(`💬 ${notif.fromUser}: ${notif.message.substring(0, 50)}${notif.message.length > 50 ? '...' : ''}`, {
              position: "top-right",
              autoClose: 5000,
              onClick: () => handleNotificationClick(notif)
            });
          }
        });
        
        return [...prev, ...newOnes];
      });
    }
  }, [socketNotifications]);

  // 🟡 Handle notification click
  const handleNotificationClick = (notif) => {
    if (!notif.chatboxId || (!notif.senderId && !notif.fromUserId)) {
      console.error("❌ Missing fields in notification:", notif);
      toast.error("This notification is incomplete and cannot open the chat.");
      return;
    }

    // 🛑 Prevent reopening if the same chatbox is already open
    if (chatDetails && chatDetails.chatboxId === notif.chatboxId) {
      console.log("✅ Chat already open for this chatbox.");
      return;
    }

    // 🧠 Determine sender and receiver IDs
    const senderId = notif.senderId || notif.fromUserId;
    const senderName = notif.senderName || notif.fromUser;
    const receiverId = notif.receiverId || notif.toUser;
    const receiverName = notif.receiverName || userName;

    // If current user is the receiver, other is sender
    const isCurrentUserSender = senderId === userId;
    const otherUserId = isCurrentUserSender ? receiverId : senderId;
    const otherUserName = isCurrentUserSender ? receiverName : senderName;

    setChatDetails({
      sellerId: otherUserId,
      sellerName: otherUserName,
      chatboxId: notif.chatboxId
    });

    // Mark notification as read and remove from visible
    markNotificationRead(notif._id);
    setVisibleNotifications((prev) =>
      prev.filter((n) => n._id !== notif._id)
    );
  };

  // 🗑️ Handle notification dismiss
  const handleNotificationDismiss = async (notifId) => {
    setVisibleNotifications((prev) =>
      prev.filter((n) => n._id !== notifId)
    );

    try {
      await deleteNotification(notifId);
      removeNotification(notifId);
      console.log('✅ Notification dismissed:', notifId);
    } catch (error) {
      console.error("❌ Failed to delete notification from backend:", error);
    }
  };

  const closeChat = () => setChatDetails(null);

  return (
    <BrowserRouter>
      {/* 🔔 Notifications */}
      <div className="notification-container">
        {visibleNotifications.map((notification) => (
          <Notification
            key={notification._id}
            id={notification._id}
            message={notification.message || notification.messageContent}
            senderId={notification.senderId || notification.fromUserId}
            senderName={notification.senderName || notification.fromUser}
            chatboxId={notification.chatboxId}
            receiverId={notification.receiverId || notification.toUser}
            receiverName={notification.receiverName}
            onClick={handleNotificationClick}
            onDismiss={handleNotificationDismiss}
          />
        ))}
      </div>

      {/* Connection Status Indicator */}
      {userId && (
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {isConnected ? 'Online' : 'Connecting...'}
          </span>
          {onlineUsers.length > 0 && (
            <span className="online-count">
              {onlineUsers.length} online
            </span>
          )}
        </div>
      )}

      {/* 🧭 Routes */}
      <Routes>
        <Route index element={<Home />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Signup" element={<Signup />} />
        <Route path="/Buy" element={<Buy />} />
        <Route path="/Profile" element={<Profile />} />
        <Route
          path="/Sell"
          element={
            <PrivateRoute>
              <Sell />
            </PrivateRoute>
          }
        />
      </Routes>

      {/* 💬 Chat Popup */}
      {chatDetails && (
        <Chat
          userId={userId}
          userName={userName}
          sellerId={chatDetails.sellerId}
          sellerName={chatDetails.sellerName}
          onClose={closeChat}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
