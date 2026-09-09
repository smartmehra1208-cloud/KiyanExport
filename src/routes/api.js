const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { sendRfqEmail, RECIPIENT_EMAIL } = require('../config/mailer');

// Models
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Contact = require('../models/Contact');
const SiteContent = require('../models/SiteContent');

const PRODUCTS_FILE = path.join(__dirname, '../data/products_store.json');
const SITE_CONTENT_FILE = path.join(__dirname, '../data/site_content.json');
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

// In-Memory & File Fallback Stores if DB is unreachable
const memoryUsers = [
  {
    _id: 1,
    fullName: 'Kiyan Admin',
    email: 'admin@kiyanwellness.com',
    phone: '9876543210',
    password: bcrypt.hashSync('Admin@12345', 10),
    role: 'admin'
  }
];
const memoryOrders = [];

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
  aboutP1: 'Kiyan Exports & Herbal Manufacturing is a premier B2B contract manufacturer and bulk supplier operating since 2014. We specialize in contract manufacturing, OEM private label formulation, and bulk supply of organic herbal extracts, Shilajit resin, Ashwagandha, and health supplements.',
  aboutP2: 'Equipped with state-of-the-art GMP certified extraction plants, we serve international buyers, Amazon sellers, wellness brands, and pharmaceutical distributors with custom packaging and factory-direct volume pricing.',
  contactEmail: 'sales@kiyanexports.com',
  contactAddress: 'Industrial Export Zone, Lucknow, UP - 226010, India',
  contactPhone: '+91 9876543210 / +91 9123456789',
  footerDesc: 'Established in 2014, Kiyan Exports is a leading B2B contract manufacturer & wholesale exporter of 100% pure organic herbal extracts and dietary supplements.',
  catalogues: [
    {
      id: 1,
      title: 'Herbal & Botanical Extracts Catalogue',
      category: 'Herbal Extracts',
      pdfUrl: '/Catelouges/Extract Catalogue 1_watermark.pdf',
      description: 'Comprehensive specifications & wholesale pricing for standardized herbal extracts.'
    },
    {
      id: 2,
      title: 'Nutraceutical Herbal Gummies Catalogue',
      category: 'Gummies & Supplements',
      pdfUrl: '/Catelouges/Gummies Catalogue_watermark.pdf',
      description: 'Pectin & gelatin herbal gummies with custom flavors & private label packaging.'
    },
    {
      id: 3,
      title: 'Ayurvedic Capsules & Tablets Catalogue',
      category: 'Capsules',
      pdfUrl: '/Catelouges/Herbal Capsules Catalogue.pdf',
      description: 'Vegetable & HPMC capsules including Shilajit, Ashwagandha & Moringa.'
    },
    {
      id: 4,
      title: 'Organic Shilajit Honey Sticks Catalogue',
      category: 'Honey & Resin',
      pdfUrl: '/Catelouges/Honey Sticks Catalogue_watermark.pdf',
      description: 'Pure Himalayan Shilajit infused raw honey sachet sticks for retail export.'
    },
    {
      id: 6,
      title: 'Sports & Gym Supplements Wholesale Catalogue',
      category: 'Sports Nutrition',
      pdfUrl: '/Catelouges/gym supplement catalogue 1_watermark.pdf',
      description: 'Plant proteins, BCAA blends, and herbal workout booster formulations.'
    },
    {
      id: 7,
      title: 'Nutraceutical Formulations & OEM Catalogue',
      category: 'Nutraceuticals',
      pdfUrl: '/Catelouges/nutra cap cat 1.pdf',
      description: 'Custom OEM contract manufacturing capabilities & laboratory specs.'
    }
  ],
  certificates: [
    {
      id: 1,
      title: 'GMP (Good Manufacturing Practice) Certificate',
      authority: 'PQC International',
      pdfUrl: '/Certificates/47214_KIYAN EXPORT_GMP_PQC (1) (1).pdf',
      description: 'Verified GMP compliance for hygienic herbal extract production & bottling.'
    },
    {
      id: 2,
      title: 'US-FDA Facility Registration',
      authority: 'US Food & Drug Administration',
      pdfUrl: '/Certificates/47214_KIYAN EXPORT_US- FDA_PQC (2) (1).pdf',
      description: 'Official FDA facility registration for exporting herbal supplements to USA.'
    },
    {
      id: 3,
      title: 'ISO 22000:2018 Food Safety Management',
      authority: 'ISO Standard Board',
      pdfUrl: '/Certificates/KIYAN EXPORT ISO 22000 FINAL (1) (1).pdf',
      description: 'International accreditation for food safety management systems & hazard control.'
    },
    {
      id: 4,
      title: 'FSSAI Government Food Safety License',
      authority: 'FSSAI India',
      pdfUrl: '/Certificates/Kiyan Fssai Renewal 2025.pdf',
      description: 'Central FSSAI manufacturing license for organic dietary food products.'
    },
    {
      id: 5,
      title: 'IndiaMart Verified TrustSeal Certificate',
      authority: 'IndiaMart InterMESH',
      pdfUrl: '/Certificates/TrustSeal_certificate.pdf',
      description: 'Verified Gold Supplier TrustSeal status for export credibility.'
    },
    {
      id: 6,
      title: 'MSME Udyam Registration Certificate',
      authority: 'Ministry of MSME, Govt of India',
      pdfUrl: '/Certificates/Udyam Registration Certificate.pdf',
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
    try {
      productsList = await Product.find({}).lean();
    } catch (e) {}

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

// AUTH - Register New User
router.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, address, city, pin } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields (Name, Email, Password).' });
    }

    // Password Security Policy Check: Min 8 chars, 1 number, 1 special character
    const isStrongPassword = password.length >= 8 && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!isStrongPassword) {
      return res.status(400).json({
        success: false,
        message: 'Security Warning: Password must be at least 8 characters long and contain at least one number (0-9) and one special character (e.g. @, #, $, %).'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check MongoDB
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email: cleanEmail });
    } catch (e) {
      existingUser = memoryUsers.find(u => u.email === cleanEmail);
    }

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address is already registered. Please login.' });
    }

    // Determine role (only explicit admin emails get admin role)
    const isAdminEmail = cleanEmail === 'admin@kiyanexports.com' || cleanEmail === 'sales@kiyanexports.com' || cleanEmail === 'admin@kiyanwellness.com' || cleanEmail === 'admin@kiorawellness.com';
    const userRole = isAdminEmail ? 'admin' : 'user';

    // Salt and hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser = null;
    try {
      newUser = await User.create({
        fullName,
        email: cleanEmail,
        phone: phone || '',
        password: hashedPassword,
        address: address || '',
        city: city || '',
        pin: pin || '',
        role: userRole
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        return res.status(400).json({ success: false, message: 'This email address is already registered. Please click Login or use a different email.' });
      }
      newUser = {
        _id: memoryUsers.length + 1,
        fullName,
        email: cleanEmail,
        phone: phone || '',
        password: hashedPassword,
        address: address || '',
        city: city || '',
        pin: pin || '',
        role: userRole
      };
      memoryUsers.push(newUser);
    }

    res.json({
      success: true,
      message: 'Registration successful! Welcome to Kiyan Wellness.',
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone || '',
        address: newUser.address || address || '',
        city: newUser.city || city || '',
        pin: newUser.pin || pin || '',
        role: newUser.role || userRole
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Registration failed' });
  }
});

// AUTH - Login Existing User
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter Email and Password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    let user = null;
    try {
      user = await User.findOne({ email: cleanEmail });
    } catch (e) {
      user = memoryUsers.find(u => u.email === cleanEmail);
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email address or password.' });
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

    const userRole = user.role || ((cleanEmail === 'admin@kiyanexports.com' || cleanEmail === 'sales@kiyanexports.com' || cleanEmail === 'admin@kiyanwellness.com' || cleanEmail === 'admin@kiorawellness.com') ? 'admin' : 'user');

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
      savedOrder = await Order.create(orderData);
    } catch (dbErr) {
      savedOrder = orderData;
      memoryOrders.push(savedOrder);
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

    // Dispatch SMTP Email Notification to smart.mehra1208@gmail.com
    const emailResult = await sendRfqEmail(rfqEntry);

    res.json({
      success: true,
      message: `Thank you ${contactName}! Your Bulk RFQ inquiry (${rfqId}) has been received & emailed via SMTP to ${RECIPIENT_EMAIL}!`,
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

// POST Chatbot AI response
router.post('/chatbot', (req, res) => {
  const { message } = req.body;
  const msg = (message || '').toLowerCase();
  let reply = '';
  let options = [];

  if (msg.includes('product') || msg.includes('item') || msg.includes('buy') || msg.includes('catalogue')) {
    reply = "Kiyan Wellness offers premium organic herbal products & natural supplements:\n1. 🌿 **Herbal Products** (Ashwagandha, Himalayan Shilajit, Moringa, Bacopa, Sea Moss)\n2. 🍃 **Wellness Supplements** (Gummies, Herbal Capsules, Organic Bark Powders)\n3. 🌶️ **Pure Spices & Teas** (Kashmiri Saffron, Green Cardamom, Digestive Extracts)";
    options = ['Show Herbal Range', 'Show Wellness Care', 'View Best Sellers'];
  } else if (msg.includes('shilajit')) {
    reply = "Our **Kiyan Himalayan Shilajit** is purified gold-grade resin containing 75%+ Fulvic Acid and 80+ essential trace minerals. Lab-certified, 100% organic, and Ayush certified!";
    options = ['View Shilajit Products', 'Certifications'];
  } else if (msg.includes('ship') || msg.includes('deliver') || msg.includes('country') || msg.includes('export')) {
    reply = "Kiyan Wellness ships directly to your doorstep across India with FREE express delivery on orders above ₹999! International shipping is also available.";
    options = ['Track Order', 'Shipping Info'];
  } else if (msg.includes('contact') || msg.includes('location') || msg.includes('address') || msg.includes('email')) {
    reply = "📍 **Head Office:** Gomti Nagar, Lucknow, UP - 226010, India.\n📧 **Email:** info@kiyanwellness.com\n📞 **Customer Support:** Available 24/7";
    options = ['Send Message', 'Company Info'];
  } else if (msg.includes('login') || msg.includes('account') || msg.includes('register')) {
    reply = "You can log in or register your Kiyan Wellness account by clicking the **Login / Register** button in the navigation bar!";
    options = ['Login / Register', 'Contact Support'];
  } else {
    reply = "Namaste! 🙏 Welcome to Kiyan Wellness (Est. 2014). We provide 100% pure organic herbal supplements and wellness products crafted for natural health.";
    options = ['Browse Herbal Range', 'Shipping & Delivery', 'Contact Support'];
  }

  res.json({
    success: true,
    reply,
    options,
    timestamp: new Date().toISOString()
  });
});

// POST Contact form submission
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and message.' });
    }

    const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      await Contact.create({
        name,
        email,
        phone: phone || '',
        subject: subject || '',
        message,
        ticketId
      });
    } catch (e) {}

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
        { upsert: true, new: true }
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
        { upsert: true, new: true }
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
    const id = parseInt(req.params.id, 10);
    if (!memorySiteContent.catalogues) memorySiteContent.catalogues = [];
    memorySiteContent.catalogues = memorySiteContent.catalogues.filter(c => c.id !== id);
    saveSiteContentStore();
    try {
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: { catalogues: memorySiteContent.catalogues } },
        { upsert: true, new: true }
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
        { upsert: true, new: true }
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
    const id = parseInt(req.params.id, 10);
    if (!memorySiteContent.certificates) memorySiteContent.certificates = [];
    memorySiteContent.certificates = memorySiteContent.certificates.filter(c => c.id !== id);
    saveSiteContentStore();
    try {
      await SiteContent.findOneAndUpdate(
        { key: 'main_content' },
        { $set: { certificates: memorySiteContent.certificates } },
        { upsert: true, new: true }
      );
    } catch (e) {}

    res.json({ success: true, message: 'Certificate deleted successfully!', certificates: memorySiteContent.certificates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete certificate', error: err.message });
  }
});


// POST Admin Add New Product
router.post('/admin/products', async (req, res) => {
  try {
    const { name, category, price, oldPrice, rating, reviewsCount, tag, isBestseller, description, ingredients, specs, image, stockQuantity } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ success: false, message: 'Name, Category, and Price are required.' });
    }

    const maxId = staticProducts.length > 0 ? Math.max(...staticProducts.map(p => p.id)) : 0;
    const newId = maxId + 1;

    const ingArray = Array.isArray(ingredients) ? ingredients : (typeof ingredients === 'string' ? ingredients.split(',').map(s => s.trim()).filter(Boolean) : ["100% Organic Extract", "Lab Certified"]);
    const specArray = Array.isArray(specs) ? specs : (typeof specs === 'string' ? specs.split(',').map(s => s.trim()).filter(Boolean) : ["Standard Pack", "Made in India"]);

    const newProd = {
      id: newId,
      name,
      category,
      price: Number(price),
      oldPrice: Number(oldPrice) || Number(price) + 200,
      rating: Number(rating) || 4.8,
      reviewsCount: Number(reviewsCount) || 10,
      tag: tag || 'HERBAL CARE',
      badge: isBestseller ? 'Best Seller' : 'Premium',
      isBestseller: !!isBestseller,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 15,
      description: description || '',
      ingredients: ingArray,
      specs: specArray,
      image: image || 'images/kiyan-logo.png'
    };

    staticProducts.push(newProd);
    saveProductsStore();
    try {
      await Product.updateOne({ id: newProd.id }, { $set: newProd }, { upsert: true });
    } catch (e) {}

    res.json({ success: true, message: 'Product added successfully!', product: newProd });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add product', error: err.message });
  }
});

// PUT Admin Edit Product
router.put('/admin/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = staticProducts.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, category, price, oldPrice, rating, reviewsCount, tag, isBestseller, description, ingredients, specs, image, stockQuantity } = req.body;

    const ingArray = ingredients !== undefined ? 
      (Array.isArray(ingredients) ? ingredients : (typeof ingredients === 'string' ? ingredients.split(',').map(s => s.trim()).filter(Boolean) : staticProducts[index].ingredients)) : 
      staticProducts[index].ingredients;

    const specArray = specs !== undefined ? 
      (Array.isArray(specs) ? specs : (typeof specs === 'string' ? specs.split(',').map(s => s.trim()).filter(Boolean) : staticProducts[index].specs)) : 
      staticProducts[index].specs;

    const updated = {
      ...staticProducts[index],
      name: name !== undefined ? name : staticProducts[index].name,
      category: category !== undefined ? category : staticProducts[index].category,
      price: price !== undefined ? Number(price) : staticProducts[index].price,
      oldPrice: oldPrice !== undefined ? Number(oldPrice) : staticProducts[index].oldPrice,
      rating: rating !== undefined ? Number(rating) : staticProducts[index].rating,
      reviewsCount: reviewsCount !== undefined ? Number(reviewsCount) : staticProducts[index].reviewsCount,
      tag: tag !== undefined ? tag : staticProducts[index].tag,
      isBestseller: isBestseller !== undefined ? !!isBestseller : staticProducts[index].isBestseller,
      badge: isBestseller ? 'Best Seller' : (staticProducts[index].badge || 'Premium'),
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : (staticProducts[index].stockQuantity !== undefined ? staticProducts[index].stockQuantity : 15),
      description: description !== undefined ? description : staticProducts[index].description,
      ingredients: ingArray,
      specs: specArray,
      image: image !== undefined ? image : staticProducts[index].image
    };

    staticProducts[index] = updated;
    saveProductsStore();
    try {
      await Product.updateOne({ id: updated.id }, { $set: updated }, { upsert: true });
    } catch (e) {}

    res.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product', error: err.message });
  }
});

// PUT Rapid Stock Quantity Update Endpoint
router.put('/admin/products/:id/stock', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = staticProducts.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { stockQuantity } = req.body;
    const qty = Math.max(0, parseInt(stockQuantity, 10) || 0);

    staticProducts[index].stockQuantity = qty;
    saveProductsStore();
    try {
      await Product.updateOne({ id }, { $set: { stockQuantity: qty } });
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

// GET Admin All Orders
router.get('/admin/orders', async (req, res) => {
  try {
    let allOrders = [];
    try {
      allOrders = await Order.find({}).sort({ createdAt: -1 }).lean();
    } catch (e) {
      allOrders = memoryOrders;
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
    }

    try {
      await Order.findOneAndUpdate({ orderId }, { status });
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

module.exports = router;

