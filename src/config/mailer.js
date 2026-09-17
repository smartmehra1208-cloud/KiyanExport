const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const RECIPIENT_EMAIL = process.env.RFQ_RECIPIENT_EMAIL || 'info@kiyanexports.com, kiyanexports.express@gmail.com';

// Direct Hosted Cloudinary Logo URL (0% Attachment Chip & 100% Reliable Gmail Display)
const LOGO_SRC = 'https://res.cloudinary.com/arkc76lz/image/upload/KIyan_export.jpg.jpg';

// Configure SMTP Transporter (Port 465 SSL is much more reliable in cloud containers than port 587)
const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
const isSecure = smtpPort === 465 || process.env.SMTP_SECURE === 'true';

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  host: process.env.SMTP_HOST || 'sg2plzcpnl505501.prod.sin2.secureserver.net',
  port: smtpPort,
  secure: isSecure,
  auth: {
    user: (process.env.SMTP_USER || 'info@kiyanexports.com').trim(),
    pass: (process.env.SMTP_PASS || 'Kiyan@2026').replace(/\s+/g, '')
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 45000,
  tls: {
    rejectUnauthorized: false
  }
});

const https = require('https');

const DEFAULT_GOOGLE_WEBHOOK = 'https://script.google.com/macros/s/AKfycbyuU4qlF54BxJweWac1cVUS4xOsxfxuMGjctOSS8vKXqzJJ572MqItxO8bjG4AYQmaI8w/exec';

async function sendEmailOverHttps(mailOptions) {
  const webhookUrl = process.env.MAIL_WEBHOOK_URL || process.env.GOOGLE_SCRIPT_EMAIL_URL || DEFAULT_GOOGLE_WEBHOOK;
  if (!webhookUrl) return null;

  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify({
        to: mailOptions.to,
        cc: mailOptions.cc || '',
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text || ''
      });

      const parsedUrl = new URL(webhookUrl);
      const req = https.request({
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 12000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`✉️ HTTPS Email dispatched via Google Webhook! HTTP Status: ${res.statusCode}`);
          resolve({ success: true, messageId: 'gas-' + Date.now() });
        });
      });

      req.on('error', (err) => {
        console.warn('⚠️ HTTPS Webhook error:', err.message);
        resolve(null);
      });
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.write(payload);
      req.end();
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Send Bulk Quotation Request Email (Amazon Prime Executive Card Style)
 */
async function sendRfqEmail(rfqData) {
  const {
    productName,
    companyName,
    contactName,
    email,
    phone,
    targetQuantity,
    shippingCountry,
    customizationDetails,
    createdAt
  } = rfqData;

  const dateStr = createdAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f2; margin: 0; padding: 25px 10px; color: #111111; -webkit-font-smoothing: antialiased; }
        .amazon-container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e7e7e7; }
        
        .header-card { padding: 25px 30px 20px 30px; background: #ffffff; border-bottom: 1px solid #eeeeee; }
        .brand-logo { max-height: 55px; width: auto; object-fit: contain; margin: 0 auto 18px auto; display: block; border: none; }
        .greeting-name { font-size: 20px; font-weight: 700; color: #111111; margin-bottom: 8px; }
        .greeting-msg { font-size: 14px; color: #333333; line-height: 1.6; margin-bottom: 14px; }
        .order-header-tag { font-size: 16px; font-weight: 800; color: #111111; letter-spacing: 0.5px; margin-top: 10px; }
        
        .details-box { background: #ffffff; border: 1px solid #e7e7e7; border-radius: 8px; margin: 20px 25px; padding: 20px 25px; }
        .details-table { width: 100%; border-collapse: collapse; }
        .col-left { width: 50%; vertical-align: top; padding-right: 15px; }
        .col-right { width: 50%; vertical-align: top; text-align: left; }
        .label-muted { font-size: 12px; color: #666666; margin-bottom: 4px; }
        .val-bold { font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px; }
        
        .cta-btn-wrap { text-align: center; margin-top: 20px; }
        .btn-amazon-amber { display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #ff9900 0%, #e67e00 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        
        .footer-card { padding: 25px 30px; background: #ffffff; text-align: center; font-size: 11px; color: #777777; line-height: 1.7; border-top: 1px solid #eeeeee; }
        .footer-brand { font-weight: 700; font-size: 13px; color: #111111; margin-top: 12px; }
      </style>
    </head>
    <body>
      <div class="amazon-container">
        <div class="header-card" style="text-align: center;">
          <img src="${LOGO_SRC}" alt="Kiyan Export" class="brand-logo" style="margin: 0 auto 16px auto; display: block; max-height: 60px; width: auto; border: none;">
          <div class="greeting-name">Hello ${contactName || 'Valued Buyer'},</div>
          <div class="greeting-msg">
            Thank you for reaching out to <strong>Kiyan Export & Herbal Manufacturing</strong>. We have received your wholesale quotation request. Our export manufacturing team will review your specifications and issue an official Proforma Invoice shortly.
          </div>
          <div class="order-header-tag">Bulk Quotation Request: ${productName || 'Herbal Extract'}</div>
        </div>

        <div class="details-box">
          <table class="details-table">
            <tr>
              <td class="col-left">
                <div class="label-muted">Target Order Quantity:</div>
                <div class="val-bold" style="color: #e67e00; font-size: 16px;">${targetQuantity || '500'} Pieces</div>
                
                <div class="label-muted">Destination Country:</div>
                <div class="val-bold">${shippingCountry || 'International'}</div>

                <div class="label-muted">Submission IST Timestamp:</div>
                <div style="font-size: 12px; color: #333; font-weight: 600;">${dateStr}</div>
              </td>
              <td class="col-right">
                <div class="label-muted">Buyer Contact Name:</div>
                <div class="val-bold">${contactName || 'N/A'}</div>

                <div class="label-muted">Company / Brand Name:</div>
                <div class="val-bold">${companyName || 'N/A'}</div>
                
                <div class="label-muted">Email & WhatsApp:</div>
                <div style="font-size: 12px; color: #0066c0; font-weight: 700;">${email || 'N/A'} • ${phone || 'N/A'}</div>
              </td>
            </tr>
            ${customizationDetails ? `
            <tr>
              <td colspan="2" style="padding-top: 15px; border-top: 1px dashed #dddddd;">
                <div class="label-muted">Custom Packaging / OEM Specifications:</div>
                <div style="font-size: 13px; color: #222222; background: #f9f9f9; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #ff9900;">
                  ${customizationDetails}
                </div>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div class="footer-card">
          <div>This automated notification was generated by Kiyan Export Wholesale Order System.</div>
          <div class="footer-brand">Kiyan Export & Herbal Manufacturing Plant</div>
          <div>IEC: 0514092811 • US-FDA Reg: 17824910284 • FSSAI License: 12721001000452</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Kiyan Export" <${process.env.SMTP_USER || 'info@kiyanexports.com'}>`,
    to: RECIPIENT_EMAIL,
    replyTo: email || RECIPIENT_EMAIL,
    subject: `🛒 [NEW RFQ QUOTE]: ${productName || 'Herbal Extract'} (${targetQuantity || '500'} Pcs) - ${companyName || contactName}`,
    html: htmlContent
  };

  // Official GoDaddy cPanel SMTP (info@kiyanexports.com on Port 465 SSL)
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ [Official GoDaddy cPanel SMTP] RFQ Notification dispatched to ${RECIPIENT_EMAIL}! MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, provider: 'cpanel-smtp' };
  } catch (smtpErr) {
    console.error(`❌ cPanel SMTP dispatch error: ${smtpErr.message}`);
    return { success: false, error: smtpErr.message };
  }
}

/**
 * Send Amazon Prime Style Order Confirmation Email with Itemized Grid & Totals
 */
async function sendOrderConfirmationEmail(orderData) {
  const {
    orderId,
    customerName,
    email,
    shippingAddress,
    paymentMethod,
    items,
    financials,
    estimatedDelivery,
    createdAtIST
  } = orderData;

  const customerEmail = email;
  const customerAddress = typeof shippingAddress === 'string' ? shippingAddress : (shippingAddress ? `${shippingAddress.street || ''}, ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.pincode || ''}` : 'Standard Delivery');

  const formattedItemsReceipt = Array.isArray(items) 
    ? items.map(i => `- ${i.name || 'Product'} (Qty: ${i.quantity || 1}) - ₹${(i.itemTotal || (i.price * (i.quantity || 1)) || 0).toLocaleString('en-IN')}`).join('\n')
    : 'No items listed';

  const dateStr = createdAtIST || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  const grandTotal = financials ? (financials.totalPayable || 0) : (orderData.totalAmount || 0);

  // Financial Breakdown Values
  const subtotal = financials ? (financials.itemsSubtotal || grandTotal) : grandTotal;
  const deliveryCharge = financials ? (financials.shippingFee || 0) : 0;
  const sgst = financials ? (financials.sgst || 0) : 0;
  const igst = financials ? (financials.igst || 0) : 0;
  const totalPayable = financials ? (financials.totalPayable || 0) : grandTotal;

  // Build Amazon Prime style items HTML table rows
  let itemsRowsHtml = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsRowsHtml = items.map((item) => {
      const itemTotal = (item.totalPrice || item.itemTotal || (item.quantity * item.price)) || 0;

      return `
        <tr style="border-bottom: 1px solid #eeeeee;">
          <td style="padding: 14px 20px; width: 50px; vertical-align: middle;">
            <div style="width: 42px; height: 42px; background: #e8f5e9; color: #2e7d32; border-radius: 6px; font-size: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 42px;">🌿</div>
          </td>
          <td style="padding: 14px 20px; vertical-align: middle; font-size: 13px; color: #111111;">
            <strong style="font-size: 14px; color: #111111; display: block;">${item.name || 'Herbal Supplement'}</strong>
            <span style="font-size: 12px; color: #555555;">Quantity: ${item.quantity || 1} Pcs × ₹${(item.price || 0).toLocaleString('en-IN')}</span>
          </td>
          <td style="padding: 14px 20px; text-align: right; vertical-align: middle; font-size: 14px; font-weight: 700; color: #111111;">
            ₹${itemTotal.toLocaleString('en-IN')}
          </td>
        </tr>
      `;
    }).join('');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f2; margin: 0; padding: 25px 10px; color: #111111; -webkit-font-smoothing: antialiased; }
        .amazon-container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e7e7e7; }
        
        .header-card { padding: 25px 30px 20px 30px; background: #ffffff; border-bottom: 1px solid #eeeeee; }
        .brand-logo { max-height: 48px; width: auto; object-fit: contain; margin-bottom: 18px; display: block; border: none; }
        .greeting-name { font-size: 20px; font-weight: 700; color: #111111; margin-bottom: 8px; }
        .greeting-msg { font-size: 14px; color: #333333; line-height: 1.6; margin-bottom: 14px; }
        .order-header-tag { font-size: 16px; font-weight: 800; color: #111111; letter-spacing: 0.5px; margin-top: 10px; }
        
        .details-box { background: #ffffff; border: 1px solid #e7e7e7; border-radius: 8px; margin: 20px 25px; padding: 20px 25px; }
        .details-table { width: 100%; border-collapse: collapse; }
        .col-left { width: 50%; vertical-align: top; padding-right: 15px; }
        .col-right { width: 50%; vertical-align: top; text-align: left; }
        .label-muted { font-size: 12px; color: #666666; margin-bottom: 4px; }
        .val-bold { font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px; }
        
        .items-box { margin: 20px 25px; border: 1px solid #e7e7e7; border-radius: 8px; overflow: hidden; }
        .items-header { background: #f7f7f7; padding: 12px 20px; font-size: 13px; font-weight: 700; color: #111111; border-bottom: 1px solid #eeeeee; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-table { width: 100%; border-collapse: collapse; }
        
        .summary-box { margin: 20px 25px 25px 25px; background: #fafafa; border: 1px solid #e7e7e7; border-radius: 8px; padding: 18px 22px; }
        .summary-row { display: flex; justify-content: space-between; font-size: 13px; color: #444444; margin-bottom: 8px; }
        .summary-row.total { font-size: 16px; font-weight: 800; color: #b12704; border-top: 1.5px solid #dddddd; padding-top: 10px; margin-top: 10px; margin-bottom: 0; }
        
        .footer-card { padding: 25px 30px; background: #ffffff; text-align: center; font-size: 11px; color: #777777; line-height: 1.7; border-top: 1px solid #eeeeee; }
        .footer-brand { font-weight: 700; font-size: 13px; color: #111111; margin-top: 12px; }
      </style>
    </head>
    <body>
      <div class="amazon-container">
        <!-- Header & Amazon Style Greeting -->
        <div class="header-card" style="text-align: center;">
          <img src="${LOGO_SRC}" alt="Kiyan Export" class="brand-logo" style="margin: 0 auto 16px auto; display: block; max-height: 60px; width: auto; border: none;">
          <div class="greeting-name">Hello ${customerName || 'Valued Customer'},</div>
          <div class="greeting-msg">
            Thank you for shopping with us. We'll send a confirmation once your items have shipped. Your order details are indicated below. If you would like to view the status of your order or make any changes to it, please visit <a href="http://localhost:3000" style="color: #0066c0; text-decoration: none;">Your Orders</a> on Kiyan Export.
          </div>
          <div class="order-header-tag">Order Confirmation: #${orderId}</div>
        </div>

        <!-- Amazon Prime Style 2-Column Order Details Card -->
        <div class="details-box">
          <table class="details-table">
            <tr>
              <td class="col-left">
                <div class="label-muted">Your order will be sent to:</div>
                <div class="val-bold" style="margin-bottom: 2px;">${customerName || 'Customer'}</div>
                <div style="font-size: 12px; color: #555555; margin-bottom: 14px;">${customerAddress || 'Standard Delivery'}</div>
                
                <div class="label-muted">Order Total:</div>
                <div class="val-price">₹${totalPayable.toLocaleString('en-IN')}</div>
              </td>
            </tr>
          </table>

          <div class="cta-btn-wrap">
            <a href="http://localhost:3000" class="btn-amazon-amber">View Order Details</a>
          </div>
        </div>

        <!-- Product Items Summary -->
        <div class="items-card">
          <div class="items-head">Order Details Summary</div>
          <table class="item-table">
            ${itemsRowsHtml}
          </table>
          <div class="summary-card">
            <div class="summary-row"><span>Items Subtotal:</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
            <div class="summary-row"><span>SGST (9%):</span><span>₹${sgst.toLocaleString('en-IN')}</span></div>
            <div class="summary-row"><span>IGST (9%):</span><span>₹${igst.toLocaleString('en-IN')}</span></div>
            <div class="summary-grand"><span>Order Total:</span><span style="color: #b12704;">₹${totalPayable.toLocaleString('en-IN')}</span></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-card">
          To learn more about ordering, go to Ordering Help on Kiyan Export.<br>
          If you want more information or need assistance, contact <a href="mailto:info@kiyanexports.com" style="color: #0066c0; text-decoration: none;">info@kiyanexports.com</a>.<br>
          We hope to see you again soon!
          <div class="footer-brand">kiyanexports.com</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const recipients = Array.from(new Set([RECIPIENT_EMAIL, customerEmail])).filter(Boolean).join(', ');

  const mailOptions = {
    from: `"Kiyan Export" <${process.env.SMTP_USER || 'info@kiyanexports.com'}>`,
    to: recipients,
    replyTo: customerEmail || RECIPIENT_EMAIL,
    subject: `Order Confirmation #${orderId}`,
    text: `Order Confirmation: #${orderId}\nHello ${customerName},\nThank you for shopping with us. Your order details are below:\n\nDelivery Date: ${estimatedDelivery || '3-5 Days'}\nDelivery To: ${customerName}\nAddress: ${customerAddress}\nOrder Total: ₹${totalPayable.toLocaleString('en-IN')}\n\nItems:\n${formattedItemsReceipt}`,
    html: htmlContent
  };

  // Official GoDaddy cPanel SMTP (info@kiyanexports.com on Port 465 SSL)
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ [Official GoDaddy cPanel SMTP] Order Confirmation dispatched to ${recipients}! MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, provider: 'cpanel-smtp' };
  } catch (smtpErr) {
    console.error(`❌ cPanel SMTP dispatch error for Order #${orderId}: ${smtpErr.message}`);
    return { success: false, error: smtpErr.message };
  }
}

async function verifySmtp() {
  try {
    return await new Promise((resolve) => {
      transporter.verify((err, success) => {
        if (err) {
          resolve({ ok: false, error: err.message, port: smtpPort });
        } else {
          resolve({ ok: true, port: smtpPort });
        }
      });
    });
  } catch (e) {
    return { ok: false, error: e.message, port: smtpPort };
  }
}

module.exports = {
  transporter,
  sendRfqEmail,
  sendOrderConfirmationEmail,
  sendOrderEmail: sendOrderConfirmationEmail,
  verifySmtp,
  RECIPIENT_EMAIL
};
