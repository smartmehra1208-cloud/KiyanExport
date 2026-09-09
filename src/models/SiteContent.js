const mongoose = require('mongoose');

const siteContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'main_content' },
  heroTagline: { type: String, default: '100% Pure Herbal Wellness • Est. 2014' },
  heroTitle: { type: String, default: 'Pure Herbal Extracts for Daily Vitality & Health' },
  heroDesc: { type: String, default: 'Experience 100% organic Himalayan Shilajit, Ashwagandha, and herbal supplements crafted with purity & natural care.' },
  heroSlide2Title: { type: String },
  heroSlide2Desc: { type: String },
  heroSlide3Title: { type: String },
  heroSlide3Desc: { type: String },
  marqueeText: { type: String },
  aboutPill: { type: String, default: '🌿 ESTABLISHED 2014 • LUCKNOW, INDIA' },
  aboutTitle: { type: String, default: 'Empowering Natural Health with Kiyan Wellness' },
  aboutP1: { type: String, default: 'Kiyan Wellness, established in 2014, is a premier direct-to-consumer B2C retail e-commerce platform dedicated to 100% organic herbal supplements, adaptogens, Himalayan Shilajit, Ashwagandha, Moringa, and traditional botanical remedies.' },
  aboutP2: { type: String, default: 'We bring nature\'s purest herbs straight to your doorstep. Every product is lab-tested for heavy metals, potency, and active ingredients, ensuring maximum efficacy for your daily wellness journey.' },
  contactEmail: { type: String, default: 'info@kiyanwellness.com' },
  contactAddress: { type: String, default: 'Gomti Nagar, Lucknow, UP - 226010, India' },
  contactPhone: { type: String, default: '+91 9876543210' },
  footerDesc: { type: String },
  catalogues: { type: Array, default: [] },
  certificates: { type: Array, default: [] }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('SiteContent', siteContentSchema);
