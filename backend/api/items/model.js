const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  collegeName: { type: String, required: true },
  sellerId: { type:Number, required: true }, // Reference to User
  sellerName: { type: String, required: true }, // Seller's name
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);
