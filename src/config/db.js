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

const DEFAULT_MONGO_URI = 'mongodb+srv://smartmehra1208_db_user:pAD2x6JIOkfawFDv@sanjeevani-roots.sxts5to.mongodb.net/Sanjeevani-roots?retryWrites=true&w=majority';
const DIRECT_REPLICA_URI = 'mongodb://smartmehra1208_db_user:pAD2x6JIOkfawFDv@ac-l8lvv7w-shard-00-00.sxts5to.mongodb.net:27017,ac-l8lvv7w-shard-00-01.sxts5to.mongodb.net:27017,ac-l8lvv7w-shard-00-02.sxts5to.mongodb.net:27017/Sanjeevani-roots?ssl=true&replicaSet=atlas-s2lkhx-shard-0&authSource=admin&retryWrites=true&w=majority';

const connectDB = async () => {
  const primaryConn = process.env.MONGO_URI || process.env.MONGODB_URI || DEFAULT_MONGO_URI;

  try {
    const conn = await mongoose.connect(primaryConn, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log(`🍃 MongoDB Atlas Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    await syncAtlasDatabase();
    return true;
  } catch (err1) {
    console.warn(`⚠️ Primary MongoDB Connection failed (${err1.message}). Trying Direct Multi-Host ReplicaSet...`);
    try {
      const conn2 = await mongoose.connect(DIRECT_REPLICA_URI, {
        serverSelectionTimeoutMS: 8000,
        family: 4
      });
      console.log(`🍃 MongoDB Atlas Connected via Direct ReplicaSet: ${conn2.connection.host}/${conn2.connection.name}`);
      await syncAtlasDatabase();
      return true;
    } catch (err2) {
      console.error(`❌ Both MongoDB Connection attempts failed: ${err2.message}`);
      return false;
    }
  }
};

module.exports = connectDB;
