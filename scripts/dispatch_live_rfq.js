const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'sg2plzcpnl505501.prod.sin2.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: 'info@kiyanexports.com',
    pass: 'Kiyan@2026'
  },
  tls: { rejectUnauthorized: false }
});

const rfqData = {
  orderId: 'RFQ-782324-3904',
  productName: 'Herbal Shilajit / Bulk Inquiry',
  companyName: 'Kiyan',
  contactName: 'Kiyanse',
  email: 'kiyan@gmail.com',
  phone: '7894561230',
  targetQuantity: '500 Pcs',
  shippingCountry: 'US',
  customizationDetails: 'Live Inquiry from Website'
};

async function main() {
  console.log('Sending live RFQ email via cPanel SMTP...');
  const info = await transporter.sendMail({
    from: '"Kiyan Export" <info@kiyanexports.com>',
    to: 'kiyanexports.express@gmail.com',
    subject: '🛒 [NEW RFQ QUOTE]: ' + rfqData.productName + ' - ' + rfqData.companyName,
    html: '<div style="font-family: Arial, sans-serif; padding: 25px; border: 2px solid #1a4d2e; border-radius: 8px; max-width: 600px;"><div style="background: #1a4d2e; color: #fff; padding: 15px 20px; border-radius: 6px; text-align: center;"><h2 style="margin: 0; color: #fff;">🌿 KIYAN EXPORT</h2><p style="margin: 5px 0 0 0; color: #d4af37; font-weight: bold;">New Bulk RFQ Inquiry #' + rfqData.orderId + '</p></div><div style="padding: 20px 0;"><p><strong>Buyer Name:</strong> ' + rfqData.contactName + '</p><p><strong>Company:</strong> ' + rfqData.companyName + '</p><p><strong>Email:</strong> ' + rfqData.email + '</p><p><strong>Phone:</strong> ' + rfqData.phone + '</p><p><strong>Country:</strong> ' + rfqData.shippingCountry + '</p><p><strong>Quantity:</strong> ' + rfqData.targetQuantity + '</p></div></div>',
    text: 'New RFQ from ' + rfqData.contactName
  });
  console.log('SUCCESS! Email dispatched! MessageId:', info.messageId);
}

main().catch(console.error);
