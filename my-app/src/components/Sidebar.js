import React, { useState, useEffect } from "react";
import "./Sidebar.css";
import { X } from "lucide-react";
import { markNotificationAsRead } from "../services/api"; 

function Sidebar({ userName, notifications = [], isOpen, onClose }) {
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  useEffect(() => {
    // Ensure notifications is always an array
    setVisibleNotifications(Array.isArray(notifications) ? notifications : []);
  }, [notifications]);

  const handleRemoveNotification = async (notif) => {
    try {
      // Remove from local state
      setVisibleNotifications((prev) =>
        prev.filter((notification) => notification._id !== notif._id)
      );

      // ✅ Mark as read in the backend
      await markNotificationAsRead(notif._id);
      console.log(`✅ Notification with ID ${notif._id} marked as read`);
    } catch (error) {
      console.error(`❌ Failed to mark notification as read with ID ${notif._id}:`, error);
    }
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <button className="close-btn" onClick={onClose}>
        <X size={24} />
      </button>

      <div className="sidebar-profile">
        <span className="user-circle">👤</span>
        <span className="username">{userName || "Logged In User"}</span>
      </div>

      <div className="sidebar-notifications">
        <h4>Notifications</h4>
        {visibleNotifications && visibleNotifications.length === 0 ? (
          <p className="no-notif">No new notifications</p>
        ) : (
          visibleNotifications && visibleNotifications.map((notif, index) => (
            <div key={notif._id || index} className="notification-item">
              <b>{notif.senderName || "Unknown"}:</b> <span>{notif.message}</span>
              <button
                className="cross-btn"
                onClick={() => handleRemoveNotification(notif)}
                title="Dismiss Notification"
              >
                &#10006;
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
