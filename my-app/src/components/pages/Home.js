import React, { useState, useEffect } from "react";
import Header from '../header';
import './Home.css';
import Sidebar from '../Sidebar.js';
import { Menu } from "lucide-react";
import { io } from "socket.io-client";

function Home() {
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    setUserName(storedName);

    // ✅ FIX: add transports: ['websocket'] to avoid polling issues
    const socket = io("http://localhost:4000", {
      transports: ['websocket'],
    });

    socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    socket.on("notification", (notif) => {
      console.log("Received notification:", notif);
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1); // increment unread count
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleNotificationClick = (notif) => {
    console.log("Clicked Notification", notif);
    // TODO: Open chatbox or redirect
  };

  const handleBellClick = () => {
    setSidebarOpen(true);         // open sidebar
    setUnreadCount(0);            // clear badge
  };

  return (
    <div className="home_container">
      {/* Hamburger for full sidebar toggle */}
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu size={26} />
      </button>

      {/* Sidebar with notifications */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        userName={userName}
      />

      {/* Main */}
      <div className="main_content">
        <Header
          onNotificationClick={handleBellClick}
          showNotificationBadge={unreadCount > 0}
        />

        <div className="centered-content">
          <div className="content">
            <h1>Welcome to College Cart</h1>
            <p>
              <b>Buy and sell second-hand items within your college community with ease.</b><br />
              <b>Join us in promoting sustainability and affordability on campus.</b>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
