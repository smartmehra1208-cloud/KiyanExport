const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

const PRODUCTS_FILE = path.join(__dirname, '../data/products_store.json');

const seedProducts = async () => {
  try {
    let productsList = [];
    if (fs.existsSync(PRODUCTS_FILE)) {
      const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      productsList = JSON.parse(raw);
    } else {
      productsList = require('../data/products');
    }

    if (!productsList || productsList.length === 0) return;

    for (const prod of productsList) {
      await Product.updateOne({ id: prod.id }, { $set: prod }, { upsert: true });
    }
    console.log(`📦 MongoDB Atlas synced with ${productsList.length} products!`);
  } catch (err) {
    console.error('❌ Product Seeding Error:', err.message);
  }
};

module.exports = seedProducts;
