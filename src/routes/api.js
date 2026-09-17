const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { sendRfqEmail, sendOrderEmail, RECIPIENT_EMAIL } = require('../config/mailer');

const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Models
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Contact = require('../models/Contact');
const SiteContent = require('../models/SiteContent');

let lastDbAttempt = 0;
const DB_RETRY_INTERVAL = 120000; // 2 minutes cooldown between connection attempts

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return true;
  const now = Date.now();
  if (now - lastDbAttempt < DB_RETRY_INTERVAL) {
    return false;
  }
  lastDbAttempt = now;
  // Trigger non-blocking background connection attempt
  connectDB().catch(() => {});
  return false;
}

const PRODUCTS_FILE = path.join(__dirname, '../data/products_store.json');
const SITE_CONTENT_FILE = path.join(__dirname, '../data/site_content.json');
const ORDERS_FILE = path.join(__dirname, '../data/orders_store.json');
const LIVE_USERS_BACKUP = path.join(__dirname, '../data/live_users_backup.json');

const memoryRfqs = [];

// Initialize Products Store from file or fallback to products.js
let staticProducts = [];
try {
  if (fs.existsSync(PRODUCTS_FILE)) {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    staticProducts = JSON.parse(raw);
  } else {
    staticProducts = require('../data/products');
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(staticProducts, null, 2), 'utf8');
  }
} catch (e) {
  console.error('Failed to load products store from disk:', e);
  staticProducts = require('../data/products');
}

function saveProductsStore() {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(staticProducts, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving products store:', e);
  }
}

// Initialize Orders Store from disk
let memoryOrders = [];
try {
  if (fs.existsSync(ORDERS_FILE)) {
    memoryOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    console.log(`📦 Loaded ${memoryOrders.length} orders from disk store.`);
  }
} catch (e) {
  console.warn('Orders store load warning:', e.message);
}

function saveOrdersStore() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(memoryOrders, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving orders store:', e);
  }
}

// In-Memory & File Fallback Stores if DB is unreachable
let memoryUsers = [
  {
    _id: 1,
    fullName: 'Kiyan Admin',
    email: 'admin@kiyanwellness.com',
    phone: '9876543210',
    password: bcrypt.hashSync('Admin@12345', 10),
    role: 'admin'
  }
];

try {
  if (fs.existsSync(LIVE_USERS_BACKUP)) {
    const rawUsers = JSON.parse(fs.readFileSync(LIVE_USERS_BACKUP, 'utf8'));
    if (Array.isArray(rawUsers) && rawUsers.length > 0) {
      memoryUsers = rawUsers;
      console.log(`👥 Loaded ${rawUsers.length} live backup users from disk.`);
    }
  }
} catch (e) {
  console.warn('Backup users load warning:', e.message);
}

function saveLiveUsersBackup() {
  try {
    fs.writeFileSync(LIVE_USERS_BACKUP, JSON.stringify(memoryUsers, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving live users backup:', e);
  }
}

// Auto-capture customer profile into permanent store & Admin Panel
function ensureCustomerProfile(customerData) {
  try {
    const rawEmail = customerData.email || customerData.customerEmail || '';
    const cleanEmail = rawEmail.toLowerCase().trim();
    if (!cleanEmail) return null;

    let user = memoryUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        _id: `cust_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: customerData.fullName || customerData.customerName || customerData.contactName || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: customerData.phone || customerData.customerPhone || '',
        address: customerData.address || customerData.customerAddress || '',
        city: customerData.city || customerData.customerCity || '',
        pin: customerData.pin || customerData.customerPin || '',
        companyName: customerData.companyName || '',
        role: 'user',
        source: customerData.source || 'Order/Inquiry Auto-Capture',
        createdAt: new Date().toISOString()
      };
      memoryUsers.unshift(user);
      saveLiveUsersBackup();
      console.log(`👤 Customer profile automatically created and saved to Admin Store: ${cleanEmail}`);
    } else {
      let updated = false;
      const phone = customerData.phone || customerData.customerPhone;
      if (!user.phone && phone) {
        user.phone = phone;
        updated = true;
      }
      const address = customerData.address || customerData.customerAddress;
      if (!user.address && address) {
        user.address = address;
        updated = true;
      }
      if (customerData.companyName && !user.companyName) {
        user.companyName = customerData.companyName;
        updated = true;
      }
      if (updated) {
        saveLiveUsersBackup();
      }
    }
    return user;
  } catch (e) {
    console.error('Error in ensureCustomerProfile:', e);
    return null;
  }
}

// Initialize Contacts Store from disk
const CONTACTS_FILE = path.join(__dirname, '../data/contacts_store.json');
let memoryContacts = [];
try {
  if (fs.existsSync(CONTACTS_FILE)) {
    memoryContacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
    console.log(`📬 Loaded ${memoryContacts.length} contacts from disk store.`);
  }
} catch (e) {
  console.warn('Contacts store load warning:', e.message);
}

function saveContactsStore() {
  try {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(memoryContacts, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving contacts store:', e);
  }
}

const defaultSiteContent = {
  heroTagline: 'VERIFIED GOLD MANUFACTURER & EXPORTER • EST. 2014',
  heroTitle: 'Bulk Ayurvedic & Herbal Extracts Direct From Manufacturer',
  heroDesc: 'Source premium Himalayan Shilajit, Ashwagandha capsules, Moringa powders & adaptogens at tiered factory wholesale pricing. Low MOQ, Custom OEM Private Labeling & Global Sea/Air Shipping.',
  heroSlide2Title: 'OEM & Private Label Contract Manufacturing',
  heroSlide2Desc: 'Custom logo branding, custom bottle packaging, and tailored herbal extraction formulations for global distributors, brands & wholesalers.',
  heroSlide3Title: 'ISO 22000 & GMP Certified Quality Assurance',
  heroSlide3Desc: 'Every bulk batch comes with COA, Heavy Metal Analysis & HPLC Purity Reports. Exporting to 45+ countries worldwide.',
  marqueeText: '🏭 VERIFIED GOLD MANUFACTURER • LOW MOQ 100-500 PCS • TIERED VOLUME DISCOUNTING • OEM & PRIVATE LABELING AVAILABLE • GLOBAL SEA & AIR FREIGHT • COA & ISO/GMP CERTIFIED',
  aboutPill: '🏭 ESTABLISHED 2014 • LUCKNOW, INDIA (EXPORTS WORLDWIDE)',
  aboutTitle: 'Leading Herbal Contract Manufacturer & Bulk Supplier',
  aboutP1: 'Kiyan Export & Herbal Manufacturing is a premier B2B contract manufacturer and bulk supplier operating since 2014. We specialize in contract manufacturing, OEM private label formulation, and bulk supply of organic herbal extracts, Shilajit resin, Ashwagandha, and health supplements.',
  aboutP2: 'Equipped with state-of-the-art GMP certified extraction plants, we serve international buyers, Amazon sellers, wellness brands, and pharmaceutical distributors with custom packaging and factory-direct volume pricing.',
  contactEmail: 'kiyanexports.express@gmail.com',
  contactAddress: 'Industrial Export Zone, Lucknow, UP - 226010, India',
  contactPhone: '+91 9876543210 / +91 9123456789',
  footerDesc: 'Established in 2014, Kiyan Export is a leading B2B contract manufacturer & wholesale exporter of 100% pure organic herbal extracts and dietary supplements.',
  catalogues: [
    {
      id: 1,
      title: 'Herbal & Botanical Extracts Catalogue',
      category: 'Herbal Extracts',
      pdfUrl: '/catalogues/extract-catalogue.pdf',
      description: 'Comprehensive specifications & wholesale pricing for standardized herbal extracts.'
    },
    {
      id: 2,
      title: 'Nutraceutical Herbal Gummies Catalogue',
      category: 'Gummies & Supplements',
      pdfUrl: '/catalogues/gummies-catalogue.pdf',
      description: 'Pectin & gelatin herbal gummies with custom flavors & private label packaging.'
    },
    {
      id: 3,
      title: 'Ayurvedic Capsules & Tablets Catalogue',
      category: 'Capsules',
      pdfUrl: '/catalogues/herbal-capsules-catalogue.pdf',
      description: 'Vegetable & HPMC capsules including Shilajit, Ashwagandha & Moringa.'
    },
    {
      id: 4,
      title: 'Organic Shilajit Honey Sticks Catalogue',
      category: 'Honey & Resin',
      pdfUrl: '/catalogues/honey-sticks-catalogue.pdf',
      description: 'Pure Himalayan Shilajit infused raw honey sachet sticks for retail export.'
    },
    {
      id: 5,
      title: 'Pure Copper Bottles & Drinkware Catalogue',
      category: 'Copperware',
      pdfUrl: '/catalogues/copper-bottles-catalogue.pdf',
      description: 'Pure handmade Indian copper bottles, jugs, tumblers & copper drinkware for wholesale export.'
    },
    {
      id: 6,
      title: 'Sports & Gym Supplements Wholesale Catalogue',
      category: 'Sports Nutrition',
      pdfUrl: '/catalogues/gym-supplement-catalogue.pdf',
      description: 'Plant proteins, BCAA blends, and herbal workout booster formulations.'
    },
    {
      id: 7,
      title: 'Nutraceutical Formulations & OEM Catalogue',
      category: 'Nutraceuticals',
      pdfUrl: '/catalogues/nutracap-catalogue.pdf',
      description: 'Custom OEM contract manufacturing capabilities & laboratory specs.'
    }
  ],
  certificates: [
    {
      id: 1,
      title: 'GMP (Good Manufacturing Practice) Certificate',
      authority: 'PQC International',
      pdfUrl: '/certificates/gmp-certificate.pdf',
      description: 'Verified GMP compliance for hygienic herbal extract production & bottling.'
    },
    {
      id: 2,
      title: 'US-FDA Facility Registration',
      authority: 'US Food & Drug Administration',
      pdfUrl: '/certificates/us-fda-certificate.pdf',
      description: 'Official FDA facility registration for exporting herbal supplements to USA.'
    },
    {
      id: 3,
      title: 'ISO 22000:2018 Food Safety Management',
      authority: 'ISO Standard Board',
      pdfUrl: '/certificates/iso-22000-certificate.pdf',
      description: 'International accreditation for food safety management systems & hazard control.'
    },
    {
      id: 4,
      title: 'FSSAI Government Food Safety License',
      authority: 'FSSAI India',
      pdfUrl: '/certificates/fssai-certificate.pdf',
      description: 'Central FSSAI manufacturing license for organic dietary food products.'
    },
    {
      id: 5,
      title: 'IndiaMart Verified TrustSeal Certificate',
      authority: 'IndiaMart InterMESH',
      pdfUrl: '/certificates/trustseal-certificate.pdf',
      description: 'Verified Gold Supplier TrustSeal status for export credibility.'
    },
    {
      id: 6,
      title: 'MSME Udyam Registration Certificate',
      authority: 'Ministry of MSME, Govt of India',
      pdfUrl: '/certificates/udyam-certificate.pdf',
      description: 'Government registered manufacturing enterprise for global export.'
    }
  ]
};

let memorySiteContent = { ...defaultSiteContent };
try {
  if (fs.existsSync(SITE_CONTENT_FILE)) {
    const raw = fs.readFileSync(SITE_CONTENT_FILE, 'utf8');
    memorySiteContent = { ...defaultSiteContent, ...JSON.parse(raw) };
  } else {
    fs.writeFileSync(SITE_CONTENT_FILE, JSON.stringify(memorySiteContent, null, 2), 'utf8');
  }
} catch (e) {
  console.error('Failed to load site content store from disk:', e);
}

function saveSiteContentStore() {
  try {
    fs.writeFileSync(SITE_CONTENT_FILE, JSON.stringify(memorySiteContent, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving site content store:', e);
  }
}

// GET all products or filter by category / search query
router.get('/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let productsList = [];
    if (mongoose.connection.readyState === 1) {
      try {
        productsList = await Product.find({}).sort({ id: 1 }).maxTimeMS(2000).lean();
      } catch (e) {
        productsList = [...staticProducts];
      }
    } else {
      ensureDbConnected().catch(() => {});
      productsList = [...staticProducts];
    }

    if (!productsList || productsList.length === 0) {
      productsList = [...staticProducts];
    }

    let filtered = productsList;

    if (category && category.toLowerCase() !== 'all') {
      filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    res.json({
      success: true,
      count: filtered.length,
      products: filtered
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: err.message });
  }
});

// GET single product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    let product = null;

    try {
      product = await Product.findOne({ id }).lean();
    } catch (dbErr) {
      product = null;
    }

    if (!product) {
      product = staticProducts.find(p => p.id === id);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST Submit a New Review for a Product
router.post('/products/:id/reviews', async (req, res) => {
  try {
    await ensureDbConnected();
    const id = parseInt(req.params.id, 10);
    const { userName, rating, comment } = req.body;

    if (!rating || !comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Please select a star rating (1-5) and write a review comment.' });
    }

    const numRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
    const reviewerName = (userName && userName.trim()) ? userName.trim() : 'Verified Customer';

    const newReview = {
      user: reviewerName,
      rating: numRating,
      comment: comment.trim(),
      createdAt: new Date()
    };

    let updatedProduct = null;

    // 1. Try updating in MongoDB Atlas
    try {
      const dbProd = await Product.findOne({ id });
      if (dbProd) {
        if (!dbProd.reviews) dbProd.reviews = [];
        dbProd.reviews.unshift(newReview);
        
        // Recalculate average rating
        const totalRatingSum = dbProd.reviews.reduce((sum, r) => sum + r.rating, 0);
        dbProd.rating = parseFloat((totalRatingSum / dbProd.reviews.length).toFixed(1));
        dbProd.reviewsCount = dbProd.reviews.length;
        
        await dbProd.save();
        updatedProduct = dbProd.toObject();
      }
    } catch (e) {
      console.warn('MongoDB review update fallback:', e.message);
    }

    // 2. Also update in-memory / JSON store
    const staticIndex = staticProducts.findIndex(p => p.id === id);
    if (staticIndex !== -1) {
      if (!staticProducts[staticIndex].reviews) {
        staticProducts[staticIndex].reviews = [];
      }
      staticProducts[staticIndex].reviews.unshift(newReview);
      const totalSum = staticProducts[staticIndex].reviews.reduce((sum, r) => sum + r.rating, 0);
      staticProducts[staticIndex].rating = parseFloat((totalSum / staticProducts[staticIndex].reviews.length).toFixed(1));
      staticProducts[staticIndex].reviewsCount = staticProducts[staticIndex].reviews.length;
      saveProductsStore();

      if (!updatedProduct) {
        updatedProduct = staticProducts[staticIndex];
      }
    }

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Thank you! Your product review has been submitted & saved successfully.',
      product: updatedProduct,
      review: newReview
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit product review', error: err.message });
  }
});

// AUTH - Register New User (Permanently saved to disk store & Admin Panel)
router.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, address, city, pin } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields (Name, Email, Password).' });
    }

    // Password length check (min 4 characters)
    if (!password || password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists in memoryUsers
    const existingUser = memoryUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (existingUser && existingUser.password) {
      return res.status(400).json({ success: false, message: 'Email address is already registered. Please login.' });
    }

    // Determine role (only explicit admin emails get admin role)
    const isAdminEmail = cleanEmail === 'admin@kiyanexports.com' || cleanEmail === 'sales@kiyanexports.com' || cleanEmail === 'admin@kiyanwellness.com' || cleanEmail === 'admin@kiorawellness.com' || cleanEmail === 'kiyanexports.express@gmail.com';
    const userRole = isAdminEmail ? 'admin' : 'user';

    // Salt and hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      _id: existingUser ? existingUser._id : `u_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : (existingUser ? existingUser.phone : '') || '',
      password: hashedPassword,
      address: address ? address.trim() : (existingUser ? existingUser.address : '') || '',
      city: city ? city.trim() : (existingUser ? existingUser.city : '') || '',
      pin: pin ? pin.trim() : (existingUser ? existingUser.pin : '') || '',
      role: userRole,
      createdAt: existingUser ? existingUser.createdAt : new Date().toISOString()
    };

    if (existingUser) {
      const idx = memoryUsers.findIndex(u => (u.email || '').toLowerCase() === cleanEmail);
      if (idx !== -1) {
        memoryUsers[idx] = { ...memoryUsers[idx], ...newUser };
      }
    } else {
      memoryUsers.unshift(newUser);
    }
    saveLiveUsersBackup();
    console.log(`👤 New User permanently registered and saved to Admin Store: ${cleanEmail}`);

    // Persist to MongoDB Atlas if connected
    if (mongoose.connection.readyState === 1) {
      User.create(newUser).catch(dbErr => {
        console.warn('⚠️ Atlas user save notice:', dbErr.message);
      });
    }

    // Send email alert to admin on new user registration
    try {
      sendRfqEmail({
        productName: `New Customer Account Registration`,
        companyName: 'Registered Customer',
        contactName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone || 'N/A',
        targetQuantity: 'New User Signup',
        shippingCountry: `${newUser.city || ''} ${newUser.pin || ''}`.trim() || 'India / International',
        customizationDetails: `New customer registered on Kiyan Export:\n• Name: ${newUser.fullName}\n• Email: ${newUser.email}\n• Phone: ${newUser.phone || 'N/A'}\n• Address: ${newUser.address || 'N/A'}, ${newUser.city || ''} ${newUser.pin || ''}`,
        createdAt: new Date().toISOString()
      }).catch(e => console.warn('Registration email alert warning:', e.message));
    } catch (mailErr) {}

    res.json({
      success: true,
      message: 'Registration successful! Welcome to Kiyan Export.',
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone || '',
        address: newUser.address || '',
        city: newUser.city || '',
        pin: newUser.pin || '',
        role: newUser.role || userRole
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Registration failed' });
  }
});

// AUTH - Login Existing User (Checks permanent store & auto-creates if new)
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter Email and Password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    let user = memoryUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);

    if (!user && mongoose.connection.readyState === 1) {
      try {
        const atlasUser = await User.findOne({ email: cleanEmail }).lean();
        if (atlasUser) {
          user = atlasUser;
          memoryUsers.unshift(atlasUser);
          saveLiveUsersBackup();
        }
      } catch (e) {}
    }

    // If user does not exist in store, auto-register them seamlessly!
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const isAdminEmail = cleanEmail === 'admin@kiyanexports.com' || cleanEmail === 'sales@kiyanexports.com' || cleanEmail === 'admin@kiyanwellness.com' || cleanEmail === 'admin@kiorawellness.com' || cleanEmail === 'kiyanexports.express@gmail.com';
      const userRole = isAdminEmail ? 'admin' : 'user';

      user = {
        _id: `u_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '',
        password: hashedPassword,
        address: '',
        city: '',
        pin: '',
        role: userRole,
        source: 'Instant Login Auto-Creation',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      memoryUsers.unshift(user);
      saveLiveUsersBackup();
      console.log(`👤 New User auto-created on Login & permanently saved to Admin Store: ${cleanEmail}`);

      // Send email alert to admin on new user login auto-creation
      try {
        sendRfqEmail({
          productName: `New Customer Account Auto-Created via Login`,
          companyName: 'Instant Login Customer',
          contactName: user.fullName,
          email: user.email,
          phone: 'N/A',
          targetQuantity: 'Login Auto-Creation',
          shippingCountry: 'India / International',
          customizationDetails: `New customer entered email in Login form & was auto-registered:\n• Email: ${user.email}`,
          createdAt: new Date().toISOString()
        }).catch(e => console.warn('Login email alert warning:', e.message));
      } catch (e) {}

      return res.json({
        success: true,
        message: 'Welcome to Kiyan Export! Your account has been created & logged in.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: '',
          address: '',
          city: '',
          pin: '',
          role: userRole
        }
      });
    }

    // Verify Password (BCrypt or plaintext comparison)
    let isPasswordValid = false;
    if (user.password) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (e) {}
      if (!isPasswordValid && user.password === password) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid email address or password.' });
    }

    // Record last login
    user.lastLoginAt = new Date().toISOString();
    saveLiveUsersBackup();

    const userRole = user.role || ((cleanEmail === 'admin@kiyanexports.com' || cleanEmail === 'sales@kiyanexports.com' || cleanEmail === 'admin@kiyanwellness.com' || cleanEmail === 'admin@kiorawellness.com' || cleanEmail === 'kiyanexports.express@gmail.com') ? 'admin' : 'user');

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user._id,
        fullName: user.fullName || user.email.split('@')[0],
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        pin: user.pin || '',
        role: userRole
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login error', error: err.message });
  }
});

// Helper function to get tier unit price based on quantity
function getTierUnitPrice(product, quantity) {
  if (!product) return 0;
  const qty = Math.max(1, quantity || 1);

  // If sample order or less than MOQ, return sample price or base price
  if (product.priceTiers && Array.isArray(product.priceTiers) && product.priceTiers.length > 0) {
    for (const tier of product.priceTiers) {
      if (qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty)) {
        return tier.price;
      }
    }
    // If quantity is above the highest tier maxQty
    const lastTier = product.priceTiers[product.priceTiers.length - 1];
    if (qty >= lastTier.minQty) {
      return lastTier.price;
    }
  }

  // Fallback to sample price or base price
  if (qty < (product.moq || 1) && product.samplePrice) {
    return product.samplePrice;
  }
  return product.price || 0;
}

// POST Calculate Cart Total (B2B Volume Tiered Pricing)
router.post('/cart/calculate', async (req, res) => {
  try {
    const { items, promoCode } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid items array' });
    }

    let subtotal = 0;
    let totalSavings = 0;

    const processedItems = items.map(item => {
      const dbProduct = staticProducts.find(p => p.id === item.id);
      const quantity = Math.max(1, item.quantity || 1);
      const unitPrice = dbProduct ? getTierUnitPrice(dbProduct, quantity) : (item.price || 0);
      const baseTierPrice = dbProduct ? (dbProduct.priceTiers ? dbProduct.priceTiers[0].price : dbProduct.price) : unitPrice;
      const oldPrice = dbProduct ? (dbProduct.oldPrice || baseTierPrice * 1.5) : unitPrice * 1.5;
      
      const itemTotal = unitPrice * quantity;
      
      subtotal += itemTotal;
      totalSavings += Math.max(0, (oldPrice - unitPrice) * quantity);

      return {
        id: item.id,
        name: dbProduct ? dbProduct.name : item.name,
        image: dbProduct ? dbProduct.image : item.image,
        moq: dbProduct ? (dbProduct.moq || 100) : 100,
        priceRange: dbProduct ? dbProduct.priceRange : '',
        unitPrice,
        price: unitPrice,
        quantity,
        itemTotal,
        isSample: quantity < (dbProduct ? (dbProduct.moq || 100) : 100)
      };
    });

    let promoDiscount = 0;
    if (promoCode) {
      const code = promoCode.toUpperCase();
      if (code === 'KIYAN10' || code === 'KIYAN10' || code === 'BULK10') {
        promoDiscount = Math.round(subtotal * 0.10);
      } else if (code === 'KIYAN20' || code === 'WHOLESALE20') {
        promoDiscount = Math.round(subtotal * 0.20);
      }
      subtotal = subtotal - promoDiscount;
    }

    const sgst = Math.round(subtotal * 0.09 * 100) / 100;
    const igst = Math.round(subtotal * 0.09 * 100) / 100;
    const grandTotal = Math.round(subtotal + sgst + igst);

    res.json({
      success: true,
      summary: {
        subtotal,
        promoDiscount,
        sgst,
        igst,
        totalSavings,
        grandTotal,
        itemCount: processedItems.reduce((acc, i) => acc + i.quantity, 0)
      },
      items: processedItems
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cart calculation error', error: err.message });
  }
});

// POST Submit Checkout Order (B2B Bulk Orders & Sample Orders)
router.post('/checkout', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, customerAddress, customerCity, customerPin, paymentMethod, items, promoCode, userEmail, companyName, gstNo } = req.body;

    if (!customerName || !customerEmail || !customerAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide company/contact details and at least one bulk item.'
      });
    }

    let subtotal = 0;
    const processedItems = items.map(item => {
      const dbProduct = staticProducts.find(p => p.id === item.id);
      const qty = Math.max(1, item.quantity || 1);
      const unitPrice = dbProduct ? getTierUnitPrice(dbProduct, qty) : (item.price || 0);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;
      return {
        id: item.id,
        name: item.name || (dbProduct ? dbProduct.name : 'Product'),
        image: item.image || (dbProduct ? dbProduct.image : ''),
        unitPrice,
        price: unitPrice,
        quantity: qty,
        itemTotal,
        moq: dbProduct ? (dbProduct.moq || 100) : 100
      };
    });

    if (promoCode) {
      const code = promoCode.toUpperCase();
      if (code === 'KIYAN10' || code === 'KIYAN10' || code === 'BULK10') {
        subtotal = subtotal - Math.round(subtotal * 0.10);
      } else if (code === 'KIYAN20' || code === 'WHOLESALE20') {
        subtotal = subtotal - Math.round(subtotal * 0.20);
      }
    }

    const sgst = Math.round(subtotal * 0.09 * 100) / 100;
    const igst = Math.round(subtotal * 0.09 * 100) / 100;
    const totalPayable = Math.round(subtotal + sgst + igst);
    const orderId = `B2B-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ' (Standard B2B Cargo Dispatch)';

    let dbUser = null;
    try {
      if (userEmail || customerEmail) {
        dbUser = await User.findOne({ email: (userEmail || customerEmail).toLowerCase().trim() });
      }
    } catch (e) {}

    const orderData = {
      orderId,
      user: dbUser ? dbUser._id : null,
      companyName: companyName || customerName,
      gstNo: gstNo || 'N/A',
      customerName,
      customerEmail: customerEmail.toLowerCase().trim(),
      customerPhone: customerPhone || 'N/A',
      customerAddress: `${customerAddress}, ${customerCity || ''} - ${customerPin || ''}`,
      paymentMethod: paymentMethod || 'Bank Wire Transfer / LC',
      paymentStatus: 'Pending Invoice Verification',
      financials: {
        subtotal,
        sgst,
        igst,
        totalPayable
      },
      items: processedItems,
      status: 'Confirmed B2B Order',
      estimatedDelivery
    };

    let savedOrder = null;
    try {
      if (mongoose.connection.readyState === 1) {
        savedOrder = await Order.create(orderData);
      }
    } catch (dbErr) {
      console.warn('⚠️ MongoDB Atlas order fallback:', dbErr.message);
    }
    if (!savedOrder) {
      savedOrder = orderData;
    }

    const plainOrder = savedOrder.toObject ? savedOrder.toObject() : savedOrder;
    plainOrder.createdAt = plainOrder.createdAt || new Date().toISOString();

    // 1. Permanently persist order to memory and disk store immediately
    memoryOrders.unshift(plainOrder);
    saveOrdersStore();
    console.log(`📦 Order ${orderId} permanently saved to Disk Store & Admin Panel.`);

    // 2. Automatically capture/update customer in Registered Customers Store
    ensureCustomerProfile({
      customerName,
      email: customerEmail,
      phone: customerPhone,
      address: customerAddress,
      city: customerCity,
      pin: customerPin,
      companyName,
      source: 'Checkout Order'
    });

    // Dispatch Rich HTML Order Notification Email to Customer & Admin
    try {
      await sendOrderEmail(savedOrder);
    } catch (mailErr) {
      console.warn('⚠️ Order email dispatch alert:', mailErr.message);
    }

    res.json({
      success: true,
      message: 'B2B Wholesale Order placed successfully! Our Export Manager will contact you with proforma invoice details.',
      order: {
        orderId: savedOrder.orderId,
        orderDate: new Date().toISOString(),
        customer: {
          name: savedOrder.customerName,
          email: savedOrder.customerEmail,
          phone: savedOrder.customerPhone,
          address: savedOrder.customerAddress
        },
        paymentMethod: savedOrder.paymentMethod,
        paymentStatus: savedOrder.paymentStatus,
        financials: savedOrder.financials,
        items: savedOrder.items,
        status: savedOrder.status,
        estimatedDelivery: savedOrder.estimatedDelivery
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Checkout failed', error: err.message });
  }
});

// POST Submit Wholesale RFQ (Request for Quote / Custom OEM Inquiry) with SMTP Email Dispatch
router.post('/rfq', async (req, res) => {
  try {
    const { companyName, contactName, email, phone, productId, productName, targetQuantity, customizationDetails, targetPrice, shippingCountry, notes } = req.body;

    if (!contactName || !email || !targetQuantity) {
      return res.status(400).json({ success: false, message: 'Please provide Contact Name, Email, and Target Quantity.' });
    }

    const rfqId = `RFQ-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const rfqEntry = {
      id: rfqId,
      productId,
      productName: productName || 'Bulk Herbal Product',
      companyName: companyName || 'N/A',
      contactName: contactName || 'Valued Buyer',
      email,
      phone: phone || 'N/A',
      targetQuantity: targetQuantity || '500',
      shippingCountry: shippingCountry || 'International',
      customizationDetails: customizationDetails || notes || 'Standard Wholesale Quotation Requested',
      createdAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    };

    memoryRfqs.unshift(rfqEntry);

    const orderRecord = {
      orderId: rfqId,
      customerName: contactName || 'Valued Buyer',
      customerEmail: email,
      customerPhone: phone || 'N/A',
      customerAddress: shippingCountry || 'International Export',
      companyName: companyName || 'N/A',
      paymentMethod: 'B2B Wholesale Inquiry / RFQ Quote',
      paymentStatus: 'Quote Requested',
      financials: {
        subtotal: 0,
        sgst: 0,
        igst: 0,
        totalPayable: Number(targetPrice) || 0
      },
      items: [
        {
          id: Number(productId) || 1,
          name: productName || 'Bulk Herbal Product',
          price: Number(targetPrice) || 0,
          quantity: Number(targetQuantity) || 100,
          itemTotal: Number(targetPrice) || 0
        }
      ],
      status: 'RFQ Received',
      estimatedDelivery: '7 - 12 Days (Port Dispatch)',
      createdAt: new Date().toISOString()
    };

    // Save to memoryOrders & disk store immediately
    memoryOrders.unshift(orderRecord);
    saveOrdersStore();
    console.log(`📦 RFQ ${rfqId} permanently saved to Disk Store & Admin Panel.`);

    // Automatically capture/update customer in Registered Customers Store
    ensureCustomerProfile({
      contactName,
      companyName,
      email,
      phone,
      address: shippingCountry,
      source: 'Wholesale RFQ Inquiry'
    });

    // If MongoDB Atlas is connected, also persist to Atlas
    if (mongoose.connection.readyState === 1) {
      Order.create(orderRecord).then(() => {
        console.log(`🍃 Successfully saved RFQ ${rfqId} to MongoDB Atlas Database!`);
      }).catch(dbErr => {
        console.warn('⚠️ MongoDB Atlas RFQ insertion fallback:', dbErr.message);
      });
    }

    // Dispatch SMTP Email Notification to kiyanexports.express@gmail.com
    let emailResult = { success: false };
    try {
      emailResult = await sendRfqEmail(rfqEntry);
    } catch (mErr) {
      console.warn('⚠️ SMTP RFQ dispatch warning:', mErr.message);
    }

    res.json({
      success: true,
      message: `Thank you ${contactName}! Your Bulk RFQ inquiry (${rfqId}) has been received & saved!`,
      rfqId,
      recipientEmail: RECIPIENT_EMAIL,
      emailDispatched: emailResult.success
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit RFQ', error: err.message });
  }
});

// GET User Orders History (by email, orderId, or search query)
router.get('/user/orders', async (req, res) => {
  try {
    const { email, query } = req.query;
    const searchTerm = (query || email || '').toLowerCase().trim();

    if (!searchTerm) {
      return res.status(400).json({ success: false, message: 'Please provide an Email address or Order ID.' });
    }

    let userOrders = [];
    try {
      userOrders = await Order.find({
        $or: [
          { customerEmail: searchTerm },
          { orderId: { $regex: searchTerm, $options: 'i' } },
          { customerName: { $regex: searchTerm, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).lean();
    } catch (dbErr) {
      userOrders = memoryOrders.filter(o => 
        (o.customerEmail && o.customerEmail.toLowerCase() === searchTerm) ||
        (o.orderId && o.orderId.toLowerCase().includes(searchTerm))
      );
    }

    // Format Timestamps in Indian Standard Time (IST UTC+5:30)
    const formattedOrders = userOrders.map(order => {
      const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const createdAtIST = createdDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) + ' IST';

      return {
        ...order,
        createdAtIST
      };
    });

    res.json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve orders history', error: err.message });
  }
});

// Advanced Levenshtein Distance & Substring Fuzzy Algorithm
function getLevenshteinDistance(a, b) {
  if (!a || !b) return 99;
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 0;
  if (a.includes(b) || b.includes(a)) return 0;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// POST Chatbot AI response with Ultra-Smart Product & Typo Auto-Detection
router.post('/chatbot', async (req, res) => {
  const { message } = req.body;
  const rawMsg = (message || '').trim();
  const msg = rawMsg.toLowerCase();
  let reply = '';
  let options = [];

  if (!msg) {
    return res.json({
      success: true,
      reply: "Namaste! 🙏 How can Kiyan Export assist you today?",
      options: ['Browse Products', 'Shipping Info', 'Contact Support']
    });
  }

  // Fetch products from DB or fallback list
  let allProducts = [];
  try {
    allProducts = await Product.find({}).lean();
  } catch (err) {
    allProducts = [];
  }

  // Robust fallback catalogue list if DB query returns empty
  if (!allProducts || allProducts.length === 0) {
    allProducts = [
      { name: 'PURE HIMALAYAN SHILAJIT RESIN', category: 'Herbal Extracts', price: 5.32, priceRange: '$5.32 - $6.26', moq: 100, unit: 'Pieces' },
      { name: 'ARJUNA CAPSULE', category: 'Cardiovascular Care', price: 5.32, priceRange: '$5.32 - $6.26', moq: 100, unit: 'Pieces' },
      { name: 'ARJUNA POWDER', category: 'Herbal Powders', price: 5.33, priceRange: '$5.33 - $6.28', moq: 100, unit: 'Kg' },
      { name: 'ASWAGANDHA POWDER', category: 'Adaptogen Supplements', price: 20.01, priceRange: '$20.01 - $23.53', moq: 100, unit: 'Kg' },
      { name: 'ASWAGANDHA CAPSULE', category: 'Herbal Supplements', price: 7.10, priceRange: '$7.10 - $8.36', moq: 50, unit: 'Pieces' },
      { name: 'MORINGA POWDER', category: 'Superfood Powders', price: 6.50, priceRange: '$6.50 - $12.00', moq: 50, unit: 'Kg' },
      { name: 'SEA MOSS POWDER', category: 'Mineral Supplements', price: 12.00, priceRange: '$12.00 - $18.00', moq: 50, unit: 'Kg' },
      { name: 'SHILAJIT GUMMIES', category: 'Wellness Gummies', price: 8.50, priceRange: '$8.50 - $14.00', moq: 100, unit: 'Jars' },
      { name: 'BAMBOO SALT', category: 'Specialty Minerals', price: 15.00, priceRange: '$15.00 - $25.00', moq: 50, unit: 'Kg' },
      { name: 'TRIPHLA POWDER', category: 'Digestive Health', price: 4.50, priceRange: '$4.50 - $8.00', moq: 100, unit: 'Kg' },
      { name: 'KASHMIRI SAFFRON', category: 'Pure Spices', price: 25.00, priceRange: '$25.00 - $45.00', moq: 10, unit: 'Grams' },
      { name: 'GREEN CARDAMOM', category: 'Whole Spices', price: 10.00, priceRange: '$10.00 - $22.00', moq: 50, unit: 'Kg' }
    ];
  }

  // 1. ULTRA-SMART FUZZY SEARCH MATCHING ACROSS ENTIRE CATALOGUE
  let bestMatchProduct = null;
  let lowestDistance = 99;
  const inputWords = msg.split(/[\s,.-]+/);

  for (const prod of allProducts) {
    const prodName = (prod.name || '').toLowerCase();
    const category = (prod.category || '').toLowerCase();
    const prodWords = prodName.split(/[\s,.-]+/);

    for (const w of inputWords) {
      if (!w || w.length < 2) continue;

      // Substring check
      if (prodName.includes(w) || category.includes(w)) {
        bestMatchProduct = prod;
        lowestDistance = 0;
        break;
      }

      // Fuzzy check
      for (const pw of prodWords) {
        if (!pw || pw.length < 2) continue;
        const dist = getLevenshteinDistance(w, pw);
        const maxAllowedDist = w.length <= 4 ? 2 : (w.length <= 7 ? 3 : 4);
        if (dist <= maxAllowedDist && dist < lowestDistance) {
          lowestDistance = dist;
          bestMatchProduct = prod;
        }
      }
    }
    if (lowestDistance === 0) break;
  }

  // 2. IF MATCHED ANY PRODUCT IN CATALOGUE (EVEN WITH HEAVY TYPOS)
  if (bestMatchProduct) {
    const priceStr = bestMatchProduct.priceRange || (bestMatchProduct.price ? `$${bestMatchProduct.price} / ${bestMatchProduct.unit || 'Pieces'}` : 'Factory Direct Rate');
    const moqStr = bestMatchProduct.moq ? `${bestMatchProduct.moq} ${bestMatchProduct.unit || 'Pieces'}` : '100 Units';

    reply = `I identified you are looking for **"${bestMatchProduct.name}"**! 🌿\n\n` +
            `• **Category:** ${bestMatchProduct.category || 'Herbal Supplement'}\n` +
            `• **Wholesale Price:** ${priceStr}\n` +
            `• **Minimum Order (MOQ):** ${moqStr}\n` +
            `• **Quality:** 100% Organic, Ayush / COA Certified & Factory Direct Export.\n\n` +
            `Would you like to view product specifications or request an express sample shipment?`;
    
    options = [`View ${bestMatchProduct.name}`, 'Request Express Sample', 'WhatsApp Export Desk'];
  }
  // 3. Shipping & Delivery Intents
  else if (msg.includes('ship') || msg.includes('deliver') || msg.includes('country') || msg.includes('export') || msg.includes('dhl') || msg.includes('courier')) {
    reply = "📦 **Kiyan Export Global Logistics & Shipping:**\n\n" +
            "• **Domestic (India):** Express doorstep delivery (2-4 Days).\n" +
            "• **Worldwide Export:** Air-Freight Cargo via DHL/FedEx (US, UK, EU, UAE, Australia & 55+ Countries).\n" +
            "• **Incoterms:** FOB & CIF Air Express available with full COA & Customs paperwork.";
    options = ['View Global Network', 'Track Shipment', 'Contact Sales'];
  }
  // 4. Contact & Address Intents
  else if (msg.includes('contact') || msg.includes('location') || msg.includes('address') || msg.includes('email') || msg.includes('phone') || msg.includes('whatsapp')) {
    reply = "📍 **Kiyan Export Corporate Headquarters:**\n" +
            "Gomti Nagar, Lucknow, UP - 226010, India.\n\n" +
            "📧 **Official Email:** kiyanexport54@gmail.com\n" +
            "💬 **WhatsApp Direct:** +91 93058 34431\n" +
            "⚡ **24/7 B2B Export Desk Active**";
    options = ['WhatsApp Chat', 'Submit RFQ Inquiry'];
  }
  // 5. Account & Admin Intents
  else if (msg.includes('login') || msg.includes('account') || msg.includes('register') || msg.includes('admin')) {
    reply = "You can log in to your **Kiyan Export Account** or access the **Admin Control Panel** using the top navigation bar menu.";
    options = ['Login / Register', 'Admin Panel'];
  }
  // 6. Generic Fallback with Smart Search Guidance
  else {
    reply = `I understand you are asking about **"${rawMsg}"**!\n\n` +
            `At Kiyan Export, we specialize in **Pure Organic Herbal Extracts, Shilajit Processing, & Global Bulk Exports**.\n` +
            `Would you like to explore our product catalogue or speak directly with our Export Desk?`;
    options = ['Browse Herbal Range', 'Download Catalogue PDF', 'WhatsApp Export Manager'];
  }

  res.json({
    success: true,
    reply,
    options,
    timestamp: new Date().toISOString()
  });
});

// POST Contact form submission (Permanently saved to disk store & Admin Panel)
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and message.' });
    }

    const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const contactRecord = {
      ticketId,
      name,
      email: email.toLowerCase().trim(),
      phone: phone || '',
      subject: subject || 'General Wholesale Inquiry',
      message,
      createdAt: new Date().toISOString()
    };

    // 1. Save to contacts store
    memoryContacts.unshift(contactRecord);
    saveContactsStore();

    // 2. Auto-capture lead into Registered Customers in Admin Panel
    ensureCustomerProfile({
      fullName: name,
      email,
      phone,
      source: 'Contact Form Inquiry'
    });

    // 3. Persist to MongoDB if connected
    try {
      if (mongoose.connection.readyState === 1) {
        await Contact.create(contactRecord);
        console.log(`🍃 Saved contact ticket ${ticketId} to MongoDB Atlas Database!`);
      }
    } catch (e) {
      console.warn('⚠️ Contact DB insertion notice:', e.message);
    }

    // 4. Dispatch Email Notification to kiyanexports.express@gmail.com
    try {
      await sendRfqEmail({
        productName: `Contact Message: ${subject || 'General Inquiry'}`,
        companyName: 'Website Visitor',
        contactName: name,
        email,
        phone: phone || 'N/A',
        targetQuantity: 'General Inquiry',
        shippingCountry: 'India / International',
        customizationDetails: message,
        createdAt: new Date().toISOString()
      });
    } catch (mailErr) {
      console.warn('⚠️ Contact email dispatch alert:', mailErr.message);
    }

    res.json({
      success: true,
      message: 'Thank you for reaching out! Our team will contact you shortly.',
      ticketId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Contact submission error', error: err.message });
  }
});

// ==========================================
// SITE CONTENT & ADMIN CMS API ENDPOINTS
// ==========================================

// Helper to automatically scan disk folders for uploaded PDFs and sync with CMS
function syncFileSystemPdfFiles() {
  if (!memorySiteContent.catalogues) memorySiteContent.catalogues = [];
  if (!memorySiteContent.certificates) memorySiteContent.certificates = [];

  // 1. Sync Catalogues
  const catDirs = [
    path.join(__dirname, '../../public/Catelouges'),
    path.join(__dirname, '../../public/catalogues')
  ];

  catDirs.forEach(catDir => {
    if (fs.existsSync(catDir)) {
      const files = fs.readdirSync(catDir);
      files.forEach(file => {
        if (file.toLowerCase().endsWith('.pdf')) {
          const dirName = path.basename(catDir);
          const pdfUrl = `/${dirName}/${file}`;
          const exists = memorySiteContent.catalogues.some(c => 
            c.pdfUrl.toLowerCase() === pdfUrl.toLowerCase() || 
            c.pdfUrl.toLowerCase().includes(file.toLowerCase())
          );

          if (!exists) {
            const newId = memorySiteContent.catalogues.length > 0
              ? Math.max(...memorySiteContent.catalogues.map(c => c.id)) + 1
              : 1;
            const title = file.replace(/_watermark/gi, '').replace(/\.pdf$/gi, '').replace(/_/g, ' ');
            memorySiteContent.catalogues.push({
              id: newId,
              title: title,
              category: 'Herbal Range',
              pdfUrl: pdfUrl,
              description: `Official PDF Catalogue document: ${file}`
            });
          }
        }
      });
    }
  });

  // 2. Sync Certificates
  const certDir = path.join(__dirname, '../../public/Certificates');
  if (fs.existsSync(certDir)) {
    const files = fs.readdirSync(certDir);
    files.forEach(file => {
      if (file.toLowerCase().endsWith('.pdf')) {
        const pdfUrl = `/Certificates/${file}`;
        const exists = memorySiteContent.certificates.some(c => 
          c.pdfUrl.toLowerCase() === pdfUrl.toLowerCase() || 
          c.pdfUrl.toLowerCase().includes(file.toLowerCase())
        );

        if (!exists) {
          const newId = memorySiteContent.certificates.length > 0
            ? Math.max(...memorySiteContent.certificates.map(c => c.id)) + 1
            : 1;
          const title = file.replace(/\.pdf$/gi, '').replace(/_/g, ' ');
          memorySiteContent.certificates.push({
            id: newId,
            title: title,
            authority: 'Audit Compliance',
            pdfUrl: pdfUrl,
            description: `Quality Audit Compliance PDF Certificate: ${file}`
          });
        }
      }
    });
  }
}

// GET Site Content (Public)
router.get('/site/content', async (req, res) => {
  try {
    let content = null;
    try {
      content = await SiteContent.findOne({ key: 'main_content' }).lean();
    } catch (e) {}

    if (!content) {
      content = memorySiteContent;
    } else {
      if (content.catalogues === undefined || content.catalogues === null) {
        content.catalogues = memorySiteContent.catalogues || [];
      }
      if (content.certificates === undefined || content.certificates === null) {
        content.certificates = memorySiteContent.certificates || [];
      }
    }

    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch content', error: err.message });
  }
});

// POST Admin Update Site Content
router.post('/admin/content', async (req, res) => {
  try {
    await ensureDbConnected();
    const { 
      heroTagline, heroTitle, heroDesc, 
      heroSlide2Title, heroSlide2Desc,
      heroSlide3Title, heroSlide3Desc,
      marqueeText,
      aboutPill, aboutTitle, aboutP1, aboutP2, 
      contactEmail, contactAddress, contactPhone,
      footerDesc
    } = req.body;

    memorySiteContent = {
      ...memorySiteContent,
      heroTagline: heroTagline !== undefined ? heroTagline : memorySiteContent.heroTagline,
      heroTitle: heroTitle !== undefined ? heroTitle : memorySiteContent.heroTitle,
      heroDesc: heroDesc !== undefined ? heroDesc : memorySiteContent.heroDesc,
      heroSlide2Title: heroSlide2Title !== undefined ? heroSlide2Title : memorySiteContent.heroSlide2Title,
      heroSlide2Desc: heroSlide2Desc !== undefined ? heroSlide2Desc : memorySiteContent.heroSlide2Desc,
      heroSlide3Title: heroSlide3Title !== undefined ? heroSlide3Title : memorySiteContent.heroSlide3Title,
      heroSlide3Desc: heroSlide3Desc !== undefined ? heroSlide3Desc : memorySiteContent.heroSlide3Desc,
      marqueeText: marqueeText !== undefined ? marqueeText : memorySiteContent.marqueeText,
      aboutPill: aboutPill !== undefined ? aboutPill : memorySiteContent.aboutPill,
      aboutTitle: aboutTitle !== undefined ? aboutTitle : memorySiteContent.aboutTitle,
      aboutP1: aboutP1 !== undefined ? aboutP1 : memorySiteContent.aboutP1,
      aboutP2: aboutP2 !== undefined ? aboutP2 : memorySiteContent.aboutP2,
      contactEmail: contactEmail !== undefined ? contactEmail : memorySiteContent.contactEmail,
      contactAddress: contactAddress !== undefined ? contactAddress : memorySiteContent.contactAddress,
      contactPhone: contactPhone !== undefined ? contactPhone : memorySiteContent.contactPhone,
      footerDesc: footerDesc !== undefined ? footerDesc : memorySiteContent.footerDesc
    };

    saveSiteContentStore();

    try {
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: memorySiteContent },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (e) {}

    res.json({ success: true, message: 'Site content updated successfully!', content: memorySiteContent });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update site content', error: err.message });
  }
});

function sanitizePdfUrl(rawUrl, defaultFolder = 'Catelouges') {
  if (!rawUrl) return '';
  let url = rawUrl.replace(/^["']|["']$/g, '').trim();
  const normalized = url.replace(/\\/g, '/');
  if (normalized.includes('Catelouges')) {
    const filename = path.basename(normalized);
    return `/Catelouges/${filename}`;
  }
  if (normalized.includes('Certificates')) {
    const filename = path.basename(normalized);
    return `/Certificates/${filename}`;
  }
  if (url.includes(':') || url.includes('\\')) {
    const filename = path.basename(normalized);
    return `/${defaultFolder}/${filename}`;
  }
  return url;
}

// POST Admin Add/Update PDF Catalogue
router.post('/admin/catalogues', async (req, res) => {
  try {
    await ensureDbConnected();
    const { id, title, category, pdfUrl, description } = req.body;
    if (!memorySiteContent.catalogues) memorySiteContent.catalogues = [];
    const cleanPdfUrl = sanitizePdfUrl(pdfUrl, 'Catelouges');

    if (id) {
      // Edit existing catalogue
      const index = memorySiteContent.catalogues.findIndex(c => c.id === parseInt(id, 10));
      if (index !== -1) {
        memorySiteContent.catalogues[index] = {
          ...memorySiteContent.catalogues[index],
          title: title || memorySiteContent.catalogues[index].title,
          category: category || memorySiteContent.catalogues[index].category,
          pdfUrl: cleanPdfUrl || memorySiteContent.catalogues[index].pdfUrl,
          description: description || memorySiteContent.catalogues[index].description
        };
      }
    } else {
      // Add new catalogue
      const newId = memorySiteContent.catalogues.length > 0 
        ? Math.max(...memorySiteContent.catalogues.map(c => c.id)) + 1 
        : 1;
      memorySiteContent.catalogues.push({
        id: newId,
        title: title || 'New PDF Catalogue',
        category: category || 'Herbal Range',
        pdfUrl: cleanPdfUrl || '/Catelouges/Extract Catalogue 1_watermark.pdf',
        description: description || 'PDF product catalogue document.'
      });
    }

    saveSiteContentStore();
    try {
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: { catalogues: memorySiteContent.catalogues } },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (e) {}

    res.json({ success: true, message: 'Catalogue saved successfully!', catalogues: memorySiteContent.catalogues });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save catalogue', error: err.message });
  }
});

// DELETE Admin Delete PDF Catalogue
router.delete('/admin/catalogues/:id', async (req, res) => {
  try {
    await ensureDbConnected();
    const id = parseInt(req.params.id, 10);
    if (!memorySiteContent.catalogues) memorySiteContent.catalogues = [];
    memorySiteContent.catalogues = memorySiteContent.catalogues.filter(c => c.id !== id);
    saveSiteContentStore();
    try {
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: { catalogues: memorySiteContent.catalogues } },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (e) {}

    res.json({ success: true, message: 'Catalogue deleted successfully!', catalogues: memorySiteContent.catalogues });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete catalogue', error: err.message });
  }
});

// POST Admin Add/Update Quality Certificate
router.post('/admin/certificates', async (req, res) => {
  try {
    await ensureDbConnected();
    const { id, title, authority, pdfUrl, description } = req.body;
    if (!memorySiteContent.certificates) memorySiteContent.certificates = [];
    const cleanPdfUrl = sanitizePdfUrl(pdfUrl, 'Certificates');

    if (id) {
      // Edit existing certificate
      const index = memorySiteContent.certificates.findIndex(c => c.id === parseInt(id, 10));
      if (index !== -1) {
        memorySiteContent.certificates[index] = {
          ...memorySiteContent.certificates[index],
          title: title || memorySiteContent.certificates[index].title,
          authority: authority || memorySiteContent.certificates[index].authority,
          pdfUrl: cleanPdfUrl || memorySiteContent.certificates[index].pdfUrl,
          description: description || memorySiteContent.certificates[index].description
        };
      }
    } else {
      // Add new certificate
      const newId = memorySiteContent.certificates.length > 0 
        ? Math.max(...memorySiteContent.certificates.map(c => c.id)) + 1 
        : 1;
      memorySiteContent.certificates.push({
        id: newId,
        title: title || 'Quality Compliance Certificate',
        authority: authority || 'Certified Authority',
        pdfUrl: cleanPdfUrl || '/Certificates/TrustSeal_certificate.pdf',
        description: description || 'Verified quality & compliance certificate.'
      });
    }

    saveSiteContentStore();
    try {
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: { certificates: memorySiteContent.certificates } },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (e) {}

    res.json({ success: true, message: 'Certificate saved successfully!', certificates: memorySiteContent.certificates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save certificate', error: err.message });
  }
});

// DELETE Admin Delete Quality Certificate
router.delete('/admin/certificates/:id', async (req, res) => {
  try {
    await ensureDbConnected();
    const id = parseInt(req.params.id, 10);
    if (!memorySiteContent.certificates) memorySiteContent.certificates = [];
    memorySiteContent.certificates = memorySiteContent.certificates.filter(c => c.id !== id);
    saveSiteContentStore();
    try {
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: { certificates: memorySiteContent.certificates } },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (e) {}

    res.json({ success: true, message: 'Certificate deleted successfully!', certificates: memorySiteContent.certificates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete certificate', error: err.message });
  }
});


function generatePriceTiersAndRange(basePrice, moq = 100, customTiers = null, customRange = null, unit = 'Pieces') {
  const p = Math.max(1, Number(basePrice) || 599);
  const m = Math.max(1, Number(moq) || 100);
  const u = unit || 'Pieces';

  // Tier 1 (Base MOQ) = Base Price
  // Tier 2 (5x MOQ) = 10% Discount
  // Tier 3 (10x MOQ) = 15% Discount
  const t1 = p;
  const t2 = Math.round(p * 0.90);
  const t3 = Math.round(p * 0.85);

  const priceTiers = [
    { minQty: m, maxQty: m * 5 - 1, price: t1, label: `${m}-${m * 5 - 1} ${u}` },
    { minQty: m * 5, maxQty: m * 10 - 1, price: t2, label: `${m * 5}-${m * 10 - 1} ${u}` },
    { minQty: m * 10, maxQty: null, price: t3, label: `${m * 10}+ ${u}` }
  ];

  const priceRange = `₹${t3} - ₹${t1} / ${u}`;
  return { priceTiers, priceRange };
}

// POST Admin Add New Product
router.post('/admin/products', async (req, res) => {
  try {
    await ensureDbConnected();
    const bodyStock = req.body.stockQuantity !== undefined ? req.body.stockQuantity : req.body.stock;
    const bodyReviews = req.body.reviewsCount !== undefined ? req.body.reviewsCount : req.body.reviews;
    const bodyBestseller = req.body.isBestseller !== undefined ? req.body.isBestseller : (req.body.bestseller !== undefined ? req.body.bestseller : req.body.isBestSeller);

    const { name, category, unit, price, oldPrice, rating, tag, description, ingredients, specs, image, moq, samplePrice, priceRange, priceTiers } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ success: false, message: 'Name, Category, and Price are required.' });
    }

    const maxId = staticProducts.length > 0 ? Math.max(...staticProducts.map(p => p.id)) : 0;
    const newId = maxId + 1;

    const numPrice = Number(price);
    const numMoq = moq !== undefined ? Number(moq) : 100;
    let finalUnit = unit || (name && name.toLowerCase().includes('powder') ? 'Kg' : 'Pieces');
    if ((!unit || unit === 'Pieces') && name && name.toLowerCase().includes('powder')) {
      finalUnit = 'Kg';
    }
    const { priceTiers: syncedTiers, priceRange: syncedRange } = generatePriceTiersAndRange(numPrice, numMoq, priceTiers, priceRange, finalUnit);

    const ingArray = Array.isArray(ingredients) ? ingredients : (typeof ingredients === 'string' ? ingredients.split(',').map(s => s.trim()).filter(Boolean) : ["100% Organic Extract", "Lab Certified"]);
    const specArray = Array.isArray(specs) ? specs : (typeof specs === 'string' ? specs.split(',').map(s => s.trim()).filter(Boolean) : ["Standard Pack", "Made in India"]);

    const newProd = {
      id: newId,
      name,
      category,
      unit: finalUnit,
      price: numPrice,
      oldPrice: Number(oldPrice) || Math.round(numPrice * 1.4),
      rating: Number(rating) || 4.8,
      reviewsCount: bodyReviews !== undefined ? Number(bodyReviews) : 10,
      tag: tag || 'HERBAL CARE',
      badge: bodyBestseller ? 'Best Seller' : 'Premium',
      isBestseller: !!bodyBestseller,
      stockQuantity: bodyStock !== undefined ? Number(bodyStock) : 15,
      inStock: bodyStock !== undefined ? (Number(bodyStock) > 0) : true,
      description: description || '',
      ingredients: ingArray,
      specs: specArray,
      image: image || 'images/kiyan-logo.png',
      moq: numMoq,
      samplePrice: samplePrice !== undefined ? Number(samplePrice) : Math.round(numPrice * 0.85),
      priceRange: syncedRange,
      priceTiers: syncedTiers
    };

    staticProducts.push(newProd);
    saveProductsStore();
    try {
      await Product.updateOne({ id: newProd.id }, { $set: newProd }, { upsert: true });
    } catch (e) {
      console.error('Error adding product to MongoDB:', e.message);
    }

    res.json({ success: true, message: 'Product added successfully!', product: newProd });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add product', error: err.message });
  }
});

// PUT Admin Edit Product
router.put('/admin/products/:id', async (req, res) => {
  try {
    await ensureDbConnected();
    const id = parseInt(req.params.id, 10);
    const index = staticProducts.findIndex(p => p.id === id);

    const bodyStock = req.body.stockQuantity !== undefined ? req.body.stockQuantity : req.body.stock;
    const bodyReviews = req.body.reviewsCount !== undefined ? req.body.reviewsCount : req.body.reviews;
    const bodyBestseller = req.body.isBestseller !== undefined ? req.body.isBestseller : (req.body.bestseller !== undefined ? req.body.bestseller : req.body.isBestSeller);

    const { name, category, unit, price, oldPrice, rating, tag, description, ingredients, specs, image, moq, samplePrice, priceRange, priceTiers } = req.body;

    const ingArray = ingredients !== undefined ? 
      (Array.isArray(ingredients) ? ingredients : (typeof ingredients === 'string' ? ingredients.split(',').map(s => s.trim()).filter(Boolean) : (index !== -1 ? staticProducts[index].ingredients : []))) : 
      (index !== -1 ? staticProducts[index].ingredients : []);

    const specArray = specs !== undefined ? 
      (Array.isArray(specs) ? specs : (typeof specs === 'string' ? specs.split(',').map(s => s.trim()).filter(Boolean) : (index !== -1 ? staticProducts[index].specs : []))) : 
      (index !== -1 ? staticProducts[index].specs : []);

    const existingProd = index !== -1 ? staticProducts[index] : {};
    const finalPrice = price !== undefined ? Number(price) : (existingProd.price || 599);
    const finalMoq = moq !== undefined ? Number(moq) : (existingProd.moq || 100);
    const prodName = name !== undefined ? name : (existingProd.name || '');
    let finalUnit = unit !== undefined ? unit : (existingProd.unit || 'Pieces');
    if ((!unit || unit === 'Pieces') && prodName.toLowerCase().includes('powder')) {
      finalUnit = 'Kg';
    }

    const { priceTiers: syncedTiers, priceRange: syncedRange } = generatePriceTiersAndRange(
      finalPrice,
      finalMoq,
      req.body.priceTiers,
      req.body.priceRange,
      finalUnit
    );

    const updated = {
      ...existingProd,
      id,
      name: name !== undefined ? name : existingProd.name,
      category: category !== undefined ? category : existingProd.category,
      unit: finalUnit,
      price: finalPrice,
      oldPrice: oldPrice !== undefined ? Number(oldPrice) : (existingProd.oldPrice || Math.round(finalPrice * 1.4)),
      rating: rating !== undefined ? Number(rating) : existingProd.rating,
      reviewsCount: bodyReviews !== undefined ? Number(bodyReviews) : (existingProd.reviewsCount !== undefined ? existingProd.reviewsCount : 1),
      tag: tag !== undefined ? tag : (existingProd.tag || 'HERBAL CARE'),
      isBestseller: bodyBestseller !== undefined ? !!bodyBestseller : !!existingProd.isBestseller,
      badge: (bodyBestseller !== undefined ? bodyBestseller : existingProd.isBestseller) ? 'Best Seller' : (existingProd.badge || 'Premium'),
      stockQuantity: bodyStock !== undefined ? Number(bodyStock) : (existingProd.stockQuantity !== undefined ? existingProd.stockQuantity : 15),
      inStock: bodyStock !== undefined ? (Number(bodyStock) > 0) : (existingProd.inStock !== undefined ? existingProd.inStock : true),
      description: description !== undefined ? description : existingProd.description,
      ingredients: ingArray,
      specs: specArray,
      image: image !== undefined ? image : existingProd.image,
      moq: finalMoq,
      samplePrice: samplePrice !== undefined ? Number(samplePrice) : (existingProd.samplePrice || Math.round(finalPrice * 0.85)),
      priceRange: syncedRange,
      priceTiers: syncedTiers
    };

    if (index !== -1) {
      staticProducts[index] = updated;
    } else {
      staticProducts.push(updated);
    }
    saveProductsStore();

    try {
      await Product.updateOne({ id }, { $set: updated }, { upsert: true });
    } catch (e) {
      console.error('Error updating DB product:', e.message);
    }

    res.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product', error: err.message });
  }
});

// PUT Rapid Stock Quantity Update Endpoint
router.put('/admin/products/:id/stock', async (req, res) => {
  try {
    await ensureDbConnected();
    const id = parseInt(req.params.id, 10);
    const index = staticProducts.findIndex(p => p.id === id);

    const { stockQuantity, stock } = req.body;
    const rawQty = stockQuantity !== undefined ? stockQuantity : stock;
    const qty = Math.max(0, parseInt(rawQty, 10) || 0);

    if (index !== -1) {
      staticProducts[index].stockQuantity = qty;
      staticProducts[index].inStock = qty > 0;
      saveProductsStore();
    }

    try {
      await Product.updateOne({ id }, { $set: { stockQuantity: qty, inStock: qty > 0 } });
    } catch (e) {}

    res.json({
      success: true,
      message: `Stock updated for #${id}: ${qty} unit(s) left (${qty === 0 ? 'SOLD OUT' : 'IN STOCK'})`,
      stockQuantity: qty,
      isSoldOut: qty === 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update stock', error: err.message });
  }
});

// DELETE Admin Delete Product
router.delete('/admin/products/:id', async (req, res) => {
  try {
    await ensureDbConnected();
    const id = parseInt(req.params.id, 10);
    const index = staticProducts.findIndex(p => p.id === id);

    if (index !== -1) {
      staticProducts.splice(index, 1);
      saveProductsStore();
    }

    try {
      await Product.deleteOne({ id });
    } catch (e) {}

    res.json({ success: true, message: 'Product deleted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product', error: err.message });
  }
});

// GET Admin All Orders (Permanent Disk Store + Atlas Direct Sync)
router.get('/admin/orders', async (req, res) => {
  try {
    let allOrders = [...memoryOrders];

    if (mongoose.connection.readyState === 1) {
      try {
        const atlasOrders = await Order.find({}).sort({ createdAt: -1 }).maxTimeMS(2000).lean();
        if (atlasOrders && atlasOrders.length > 0) {
          for (const ao of atlasOrders) {
            if (!allOrders.some(o => o.orderId === ao.orderId)) {
              allOrders.push(ao);
            }
          }
        }
      } catch (e) {}
    }

    const formatted = allOrders.map(order => {
      const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const createdAtIST = createdDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' IST';
      return { ...order, createdAtIST };
    });

    res.json({ success: true, count: formatted.length, orders: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin orders', error: err.message });
  }
});

// PUT Admin Update Order Status
router.put('/admin/orders/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    let found = memoryOrders.find(o => o.orderId === orderId);
    if (found) {
      found.status = status;
      saveOrdersStore();
    }

    try {
      if (mongoose.connection.readyState === 1) {
        await Order.findOneAndUpdate({ orderId }, { status });
      }
    } catch (e) {}

    res.json({ success: true, message: `Order ${orderId} status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: err.message });
  }
});

// GET Admin All RFQs
router.get('/admin/rfqs', (req, res) => {
  res.json({ success: true, count: memoryRfqs.length, rfqs: memoryRfqs });
});

// GET Admin All Registered Users / Customers (Permanent Disk Store + Atlas Direct Sync)
router.get('/admin/users', async (req, res) => {
  try {
    let allUsers = memoryUsers.map(u => {
      const copy = { ...u };
      delete copy.password;
      return copy;
    });

    if (mongoose.connection.readyState === 1) {
      try {
        const atlasUsers = await User.find({}, '-password').maxTimeMS(2000).sort({ createdAt: -1 }).lean();
        if (atlasUsers && atlasUsers.length > 0) {
          for (const au of atlasUsers) {
            if (!allUsers.some(u => (u.email || '').toLowerCase() === (au.email || '').toLowerCase())) {
              allUsers.push(au);
            }
          }
        }
      } catch (dbErr) {}
    }

    const formatted = allUsers.map(user => {
      const createdDate = user.createdAt ? new Date(user.createdAt) : new Date();
      const createdAtIST = createdDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' IST';
      return { ...user, createdAtIST };
    });

    res.json({ success: true, count: formatted.length, users: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch registered users', error: err.message });
  }
});

// GET System Health & Diagnostics
router.get('/diagnostic', async (req, res) => {
  const https = require('https');
  const net = require('net');

  const result = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    mongoConnectionState: mongoose.connection.readyState,
    mongoState: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    counts: {
      usersInMemory: memoryUsers.length,
      ordersInMemory: memoryOrders.length,
      productsInMemory: staticProducts.length
    },
    networkChecks: {}
  };

  try {
    const ipRes = await new Promise((resolve, reject) => {
      const reqNet = https.get('https://api.ipify.org?format=json', { timeout: 3500 }, r => {
        let d = '';
        r.on('data', chunk => d += chunk);
        r.on('end', () => {
          try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d }); }
        });
      });
      reqNet.on('error', reject);
      reqNet.on('timeout', () => { reqNet.destroy(); reject(new Error('Timeout')); });
    });
    result.publicEgressIp = ipRes.ip || ipRes;
  } catch(e) {
    result.publicEgressIp = 'Probe Failed: ' + e.message;
  }

  const probePort = (host, port, timeout = 3000) => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve({ host, port, status: 'OPEN' });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ host, port, status: 'TIMED_OUT' });
      });
      socket.on('error', (err) => {
        socket.destroy();
        resolve({ host, port, status: 'BLOCKED / ERROR', error: err.code || err.message });
      });
      socket.connect(port, host);
    });
  };

  try {
    result.networkChecks.gmailSmtp465 = await probePort('smtp.gmail.com', 465);
    result.networkChecks.gmailSmtp587 = await probePort('smtp.gmail.com', 587);
    result.networkChecks.mongoAtlasShard0 = await probePort('ac-l8lvv7w-shard-00-00.sxts5to.mongodb.net', 27017);
  } catch (probeErr) {
    result.networkChecks.error = probeErr.message;
  }

  res.json(result);
});

module.exports = router;

