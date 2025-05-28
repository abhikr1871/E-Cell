import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { getMessages } from '../services/api';
import socketManager from '../services/socket';
import { Send, X, MessageCircle, User, Loader2 } from 'lucide-react';

const Chat = ({ userId, sellerId, userName, sellerName, onClose }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [error, setError] = useState(null);

    const chatboxId = [userId, sellerId].sort().join('_');
    const chatEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Load chat history and setup socket
    useEffect(() => {
        const loadChatHistory = async () => {
            try {
                setLoading(true);
                setError(null);
                const messages = await getMessages(chatboxId);
                setChatHistory(Array.isArray(messages) ? messages : []);
            } catch (error) {
                console.error("❌ Failed to fetch chat history:", error);
                setError("Failed to load chat history");
            } finally {
                setLoading(false);
            }
        };

        loadChatHistory();
    }, [chatboxId]);

    // Socket setup and event handlers
    useEffect(() => {
        if (!userId || !sellerId) {
            console.error("Missing userId or sellerId", { userId, sellerId });
            setError("Invalid chat parameters");
            return;
        }

        // Join the chat room
        socketManager.joinChat(chatboxId);
        setConnectionStatus('connected');

        // Handle new messages
        const handleReceiveMessage = (newMessage) => {
            console.log("📥 Received message via socket:", newMessage);
            
            // Only add if it's for this chat and not from current user
            if (newMessage.chatboxId === chatboxId && newMessage.senderId !== userId) {
                setChatHistory((prev) => {
                    // Avoid duplicates
                    const exists = prev.some(msg => 
                        msg._id === newMessage.messageId || 
                        (msg.timestamp === newMessage.timestamp && msg.message === newMessage.message)
                    );
                    if (exists) return prev;
                    
                    return [...prev, {
                        _id: newMessage.messageId,
                        senderId: newMessage.senderId,
                        receiverId: newMessage.receiverId,
                        senderName: newMessage.senderName,
                        receiverName: newMessage.receiverName,
                        message: newMessage.message,
                        timestamp: newMessage.timestamp,
                        read: false
                    }];
                });
            }
        };

        // Handle message sent confirmation
        const handleMessageSent = (data) => {
            console.log("✅ Message sent confirmation:", data);
            setSending(false);
        };

        // Handle typing indicators
        const handleUserTyping = (data) => {
            if (data.userId !== userId) {
                setOtherUserTyping(data.isTyping);
                
                if (data.isTyping) {
                    // Clear typing after 3 seconds if no update
                    setTimeout(() => setOtherUserTyping(false), 3000);
                }
            }
        };

        // Handle message read receipts
        const handleMessageRead = (data) => {
            setChatHistory(prev => prev.map(msg => 
                msg._id === data.messageId ? { ...msg, read: true } : msg
            ));
        };

        // Handle connection status changes
        const handleConnect = () => {
            setConnectionStatus('connected');
            setError(null);
        };

        const handleDisconnect = () => {
            setConnectionStatus('disconnected');
        };

        const handleError = (error) => {
            console.error("❌ Socket error in chat:", error);
            setError("Connection error");
            setConnectionStatus('error');
        };

        // Set up event listeners
        socketManager.on('receiveMessage', handleReceiveMessage);
        socketManager.on('messageSent', handleMessageSent);
        socketManager.on('userTyping', handleUserTyping);
        socketManager.on('messageRead', handleMessageRead);
        socketManager.on('connect', handleConnect);
        socketManager.on('disconnect', handleDisconnect);
        socketManager.on('error', handleError);

        return () => {
            // Leave chat room and cleanup
            socketManager.leaveChat(chatboxId);
            socketManager.off('receiveMessage', handleReceiveMessage);
            socketManager.off('messageSent', handleMessageSent);
            socketManager.off('userTyping', handleUserTyping);
            socketManager.off('messageRead', handleMessageRead);
            socketManager.off('connect', handleConnect);
            socketManager.off('disconnect', handleDisconnect);
            socketManager.off('error', handleError);
        };
    }, [chatboxId, userId, sellerId]);

    // Handle typing indicators
    const handleTyping = (typing) => {
        if (typing !== isTyping) {
            setIsTyping(typing);
            socketManager.sendTypingIndicator(chatboxId, typing);
        }

        // Clear typing indicator after 2 seconds of no typing
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        if (typing) {
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                socketManager.sendTypingIndicator(chatboxId, false);
            }, 2000);
        }
    };

    const handleInputChange = (e) => {
        setMessage(e.target.value);
        handleTyping(e.target.value.length > 0);
    };

    const handleSendMessage = async () => {
        if (!message.trim() || sending) return;

        const messageText = message.trim();
        if (messageText.length > 1000) {
            setError("Message too long (max 1000 characters)");
            return;
        }

        setSending(true);
        setError(null);

        const newMessage = {
            senderId: userId,
            receiverId: String(sellerId),
            senderName: String(userName),
            receiverName: String(sellerName),
            message: messageText,
            timestamp: new Date(),
            read: false,
        };

        // Add to local state immediately for better UX
        const localMessage = {
            ...newMessage,
            _id: 'temp_' + Date.now(),
            sending: true
        };

        setChatHistory((prev) => [...prev, localMessage]);
        setMessage('');
        handleTyping(false);

        // Send via socket
        socketManager.sendMessage(newMessage);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return '#10b981';
            case 'connecting': return '#f59e0b';
            case 'disconnected': return '#ef4444';
            case 'error': return '#dc2626';
            default: return '#6b7280';
        }
    };

    // Group messages by date
    const groupedMessages = chatHistory.reduce((groups, message) => {
        const date = formatDate(message.timestamp);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(message);
        return groups;
    }, {});

    return (
        <div className="chat-overlay">
            <div className="chat-container">
                {/* Chat Header */}
                <div className="chat-header">
                    <div className="chat-header-info">
                        <div className="user-avatar">
                            <User size={20} />
                        </div>
                        <div className="user-details">
                            <h2 className="user-name">{sellerName}</h2>
                            <div className="connection-status">
                                <div 
                                    className="status-indicator" 
                                    style={{ backgroundColor: getConnectionStatusColor() }}
                                ></div>
                                <span className="status-text">
                                    {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose} aria-label="Close chat">
                        <X size={20} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>&times;</button>
                    </div>
                )}

                {/* Chat Messages */}
                <div className="chat-messages">
                    {loading ? (
                        <div className="loading-container">
                            <Loader2 className="loading-spinner" size={24} />
                            <span>Loading chat history...</span>
                        </div>
                    ) : (
                        <>
                            {Object.entries(groupedMessages).map(([date, messages]) => (
                                <div key={date}>
                                    <div className="date-separator">
                                        <span>{date}</span>
                                    </div>
                                    {messages.map((msg, index) => (
                                        <div
                                            key={msg._id || index}
                                            className={`message ${msg.senderId === userId ? 'sent' : 'received'} ${msg.sending ? 'sending' : ''}`}
                                        >
                                            <div className="message-content">
                                                <span className="message-text">{msg.message}</span>
                                                <div className="message-meta">
                                                    <span className="message-time">
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                    {msg.senderId === userId && (
                                                        <span className={`message-status ${msg.read ? 'read' : 'sent'}`}>
                                                            {msg.sending ? '⏳' : msg.read ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}

                            {/* Typing Indicator */}
                            {otherUserTyping && (
                                <div className="typing-indicator">
                                    <div className="typing-animation">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span className="typing-text">{sellerName} is typing...</span>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </>
                    )}
                </div>

                {/* Chat Input */}
                <div className="chat-input-container">
                    <div className="chat-input-wrapper">
                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            value={message}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            placeholder={`Message ${sellerName}...`}
                            rows={1}
                            maxLength={1000}
                            disabled={connectionStatus !== 'connected'}
                        />
                        <button
                            className={`send-button ${!message.trim() || sending || connectionStatus !== 'connected' ? 'disabled' : ''}`}
                            onClick={handleSendMessage}
                            disabled={!message.trim() || sending || connectionStatus !== 'connected'}
                            aria-label="Send message"
                        >
                            {sending ? <Loader2 className="button-spinner" size={18} /> : <Send size={18} />}
                        </button>
                    </div>
                    <div className="input-footer">
                        <span className="character-count">
                            {message.length}/1000
                        </span>
                        {isTyping && (
                            <span className="typing-status">Typing...</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
