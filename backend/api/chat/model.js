const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  message: { type: String, required: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
  senderName: { type: String, required: true },
  receiverName: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  readBy: { type: String },
  messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date }
});

const chatboxSchema = new mongoose.Schema({
  chatboxId: { type: String, required: true, unique: true },
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  messages: [messageSchema],
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Update lastActivity whenever messages are added
chatboxSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastActivity = new Date();
  }
  next();
});

// Index for better performance
chatboxSchema.index({ chatboxId: 1 });
chatboxSchema.index({ senderId: 1, receiverId: 1 });
chatboxSchema.index({ lastActivity: -1 });

const Chatbox = mongoose.model('Chatbox', chatboxSchema);
module.exports = Chatbox;
