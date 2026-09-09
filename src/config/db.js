const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const SiteContent = require('../models/SiteContent');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const PRODUCTS_FILE = path.join(__dirname, '../data/products_store.json');
const SITE_CONTENT_FILE = path.join(__dirname, '../data/site_content.json');

const syncAtlasDatabase = async () => {
  try {
    // 1. Sync Products
    if (fs.existsSync(PRODUCTS_FILE)) {
      const productsList = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
      for (const prod of productsList) {
        await Product.updateOne({ id: prod.id }, { $set: prod }, { upsert: true });
      }
      console.log(`📦 MongoDB Atlas synced: ${productsList.length} products updated.`);
    }

    // 2. Sync Site Content (Text, Catalogues, Certificates)
    if (fs.existsSync(SITE_CONTENT_FILE)) {
      const content = JSON.parse(fs.readFileSync(SITE_CONTENT_FILE, 'utf8'));
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: { ...content, key: 'main_content' } },
        { upsert: true, new: true }
      );
      console.log(`📑 MongoDB Atlas synced: Site text, catalogues & certificates updated.`);
    }

    // 3. Ensure Default Admin User exists in Atlas
    const adminEmail = 'admin@kiyanwellness.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        fullName: 'Kiyan Admin',
        email: adminEmail,
        phone: '9876543210',
        password: bcrypt.hashSync('Admin@12345', 10),
        role: 'admin'
      });
      console.log(`👑 MongoDB Atlas synced: Admin user (${adminEmail}) created.`);
    }
  } catch (err) {
    console.error('❌ Error syncing data to MongoDB Atlas:', err.message);
  }
};

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!connStr || connStr.includes('cluster0.mongodb.net')) {
      console.log('💡 Notice: Set valid MongoDB Atlas URI in .env (MONGO_URI) to connect cloud DB.');
      return false;
    }
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 8000
    });
    console.log(`🍃 MongoDB Atlas Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    await syncAtlasDatabase();
    return true;
  } catch (err) {
    console.warn(`⚠️ MongoDB Connection Warning: ${err.message}`);
    console.warn(`💡 Operating in Standalone File-Store Mode with full persistent CRUD support.`);
    return false;
  }
};

module.exports = connectDB;
