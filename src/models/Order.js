const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  companyName: { type: String, default: '' },
  gstNo: { type: String, default: '' },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  customerAddress: { type: String, required: true },
  paymentMethod: { type: String, default: 'Bank Wire Transfer / LC' },
  paymentStatus: { type: String, default: 'Pending' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  financials: {
    subtotal: { type: Number, required: true },
    sgst: { type: Number, required: true },
    igst: { type: Number, required: true },
    totalPayable: { type: Number, required: true }
  },
  items: [
    {
      id: { type: Number },
      name: { type: String },
      image: { type: String },
      price: { type: Number },
      quantity: { type: Number },
      itemTotal: { type: Number }
    }
  ],
  status: { type: String, default: 'Confirmed' },
  estimatedDelivery: { type: String, default: '' }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Order', orderSchema);
