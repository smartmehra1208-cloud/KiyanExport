const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: String, required: true, default: 'Verified Buyer' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  badge: { type: String, default: '' },
  rating: { type: Number, default: 5.0 },
  reviewsCount: { type: Number, default: 1 },
  price: { type: Number, required: true },
  oldPrice: { type: Number, required: true },
  image: { type: String, required: true },
  thumbnails: [{ type: String }],
  description: { type: String, default: '' },
  ingredients: [{ type: String }],
  specs: [{ type: String }],
  inStock: { type: Boolean, default: true },
  reviews: [reviewSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
