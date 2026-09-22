const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: Number, default: 0 },
  productName: { type: String, default: 'Overall Kiyan Export Service' },
  name: { type: String, required: true },
  location: { type: String, default: 'Verified Buyer' },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  comment: { type: String, required: true },
  approved: { type: Boolean, default: true },
  isTop: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Review', reviewSchema);
