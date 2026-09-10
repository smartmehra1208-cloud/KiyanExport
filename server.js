const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const compression = require('compression');
require('dotenv').config();

const connectDB = require('./src/config/db');
const seedProducts = require('./src/config/seedProducts');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Helper to find local Network IPv4 Address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Enable Gzip / Brotli Compression for fast page load
app.use(compression());

// Enable CORS
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with production cache control & PDF view-only protection
app.use(['/catalogues', '/Catelouges', '/catelouges'], express.static(path.join(__dirname, 'public/catalogues'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
}));

app.use(['/certificates', '/Certificates'], express.static(path.join(__dirname, 'public/certificates'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
}));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));
app.use(express.static(__dirname, {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    } else if (!filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// API Routes
const apiRoutes = require('./src/routes/api');
const razorpayRoutes = require('./src/routes/razorpay');

app.use('/api', apiRoutes);
app.use('/api/payment', razorpayRoutes);

// Fallback single page router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express Server & Connect to Database
const startServer = async () => {
  const localIP = getLocalIP();
  await connectDB();

  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`🌿 Kiyan Exports / Kiyan Wellness Server Active!`);
    console.log(`💻 Local Machine URL    : http://localhost:${PORT}`);
    console.log(`📱 Personal / LAN IP URL: http://${localIP}:${PORT}`);
    console.log(`🌐 Network Accessible  : http://${localIP}:${PORT}`);
    console.log(`⚡ Mode: Full Dual Sync (MongoDB Atlas & Standalone File-Store)`);
    console.log(`====================================================`);
  });
};

startServer();
