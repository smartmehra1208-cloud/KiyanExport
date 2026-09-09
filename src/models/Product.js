const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  badge: { type: String, default: '' },
  rating: { type: Number, default: 5.0 },
  price: { type: Number, required: true },
  oldPrice: { type: Number, required: true },
  image: { type: String, required: true },
  thumbnails: [{ type: String }],
  description: { type: String, default: '' },
  ingredients: [{ type: String }],
  specs: [{ type: String }],
  inStock: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
