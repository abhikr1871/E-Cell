const mongoose = require('mongoose');

// Single notification schema (embedded in array)
const singleNotificationSchema = new mongoose.Schema({
  notifId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  toUser: { type: String, ref: 'User', required: true },
  fromUser: { type: String, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 500 },
  type: { type: String, enum: ['chat', 'system', 'alert'], default: 'chat' },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  metadata: {
    messageId: { type: String },
    messagePreview: { type: String, maxlength: 100 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  }
}, { _id: false });

// Main schema for each chatbox (for notifications)
const chatNotificationSchema = new mongoose.Schema({
  chatboxId: { type: String, required: true, unique: true }, // e.g. 'user1_user2'
  users: [{ type: String, ref: 'User' }], // Track both users for efficient querying
  notifications: [singleNotificationSchema],
  lastNotificationAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient lookup
chatNotificationSchema.index({ chatboxId: 1 });
chatNotificationSchema.index({ users: 1 });
chatNotificationSchema.index({ lastNotificationAt: -1 });
chatNotificationSchema.index({ "notifications.toUser": 1, "notifications.read": 1 });
chatNotificationSchema.index({ "notifications.createdAt": -1 });

// Update lastNotificationAt when notifications are added
chatNotificationSchema.pre('save', function(next) {
  if (this.notifications && this.notifications.length > 0) {
    this.lastNotificationAt = new Date();
  }
  next();
});

// Virtual to get unread count for a specific user
chatNotificationSchema.methods.getUnreadCountForUser = function(userId) {
  return this.notifications.filter(notif => 
    notif.toUser === userId && !notif.read
  ).length;
};

module.exports = mongoose.model('ChatNotification', chatNotificationSchema);
