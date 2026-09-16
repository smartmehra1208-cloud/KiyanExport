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
  tag: { type: String, default: 'HERBAL CARE' },
  badge: { type: String, default: '' },
  isBestseller: { type: Boolean, default: false },
  stockQuantity: { type: Number, default: 15 },
  rating: { type: Number, default: 5.0 },
  reviewsCount: { type: Number, default: 1 },
  price: { type: Number, required: true },
  oldPrice: { type: Number, default: 0 },
  moq: { type: Number, default: 100 },
  unit: { type: String, default: 'Pieces' },
  samplePrice: { type: Number, default: 0 },
  priceRange: { type: String, default: '' },
  priceTiers: [{
    minQty: Number,
    maxQty: Number,
    price: Number
  }],
  image: { type: String, required: true },
  thumbnails: [{ type: String }],
  description: { type: String, default: '' },
  ingredients: [{ type: String }],
  specs: [{ type: String }],
  inStock: { type: Boolean, default: true },
  reviews: [reviewSchema]
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Product', productSchema);

