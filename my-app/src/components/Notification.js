import React, { useState, useEffect } from 'react';
import './Notification.css';
import { MessageCircle, X, User, Clock } from 'lucide-react';

const Notification = ({ 
  id, 
  message, 
  senderId, 
  senderName, 
  chatboxId, 
  receiverId, 
  receiverName, 
  onClick, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 10 seconds if not hovered
  useEffect(() => {
    if (isHovered) return;
    
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [isHovered]);

  const handleClick = () => {
    onClick({
      _id: id,
      chatboxId,
      senderId,
      senderName,
      receiverId,
      receiverName,
      message,
      type: 'chat'
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  const truncateMessage = (text, maxLength = 80) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div 
      className={`notification ${isVisible ? 'visible' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="notification-content">
        <div className="notification-header">
          <div className="notification-avatar">
            <User size={16} />
          </div>
          <div className="notification-info">
            <div className="notification-sender">
              {senderName || 'Unknown User'}
            </div>
            <div className="notification-time">
              <Clock size={12} />
              <span>{formatTime()}</span>
            </div>
          </div>
          <button 
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="notification-body">
          <div className="notification-icon">
            <MessageCircle size={20} />
          </div>
          <div className="notification-text">
            <span className="notification-message">
              {truncateMessage(message)}
            </span>
            <div className="notification-action">
              Click to open chat
            </div>
          </div>
        </div>
      </div>
      
      <div className="notification-progress">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
};

export default Notification;
