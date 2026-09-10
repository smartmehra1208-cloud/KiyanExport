const nodemailer = require('nodemailer');

const RECIPIENT_EMAIL = process.env.RFQ_RECIPIENT_EMAIL || 'smart.mehra1208@gmail.com';

// Configure SMTP Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: (process.env.SMTP_USER || 'smart.mehra1208@gmail.com').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '')
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Send Bulk Quotation Request Email via SMTP
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

  const dateStr = createdAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f5; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #d8e2dc; }
        .header { background: #2d5a27; padding: 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 5px 0 0 0; font-size: 13px; color: #d4a373; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 30px; }
        .badge { display: inline-block; background: #c68b59; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .info-table th, .info-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #edf2f0; }
        .info-table th { background: #f9f6f0; color: #2d5a27; font-weight: 700; width: 35%; }
        .info-table td { color: #2c3e50; font-weight: 600; }
        .notes-box { background: #f9f6f0; border-left: 4px solid #c68b59; padding: 15px; margin-top: 20px; border-radius: 4px; font-size: 14px; color: #444; }
        .footer { background: #f9f6f0; padding: 18px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 KIYAN EXPORTS & HERBAL MANUFACTURING</h1>
          <p>Official B2B Bulk Quotation Request Dossier</p>
        </div>
        <div class="content">
          <div class="badge">📩 NEW BULK RFQ QUOTATION RECEIVED</div>
          <p>A buyer has submitted a new bulk quotation inquiry on the website. Details below:</p>
          
          <table class="info-table">
            <tr>
              <th>Requested Product</th>
              <td><strong style="color: #2d5a27; font-size: 16px;">${productName || 'Herbal Product'}</strong></td>
            </tr>
            <tr>
              <th>Target Quantity</th>
              <td><strong style="color: #c68b59; font-size: 15px;">${targetQuantity || '500'} Pieces</strong></td>
            </tr>
            <tr>
              <th>Buyer / Contact Name</th>
              <td>${contactName || 'N/A'}</td>
            </tr>
            <tr>
              <th>Company / Brand</th>
              <td>${companyName || 'N/A'}</td>
            </tr>
            <tr>
              <th>Email Address</th>
              <td><a href="mailto:${email}">${email || 'N/A'}</a></td>
            </tr>
            <tr>
              <th>Phone / WhatsApp</th>
              <td><a href="https://wa.me/${(phone || '').replace(/[^0-9]/g, '')}">${phone || 'N/A'}</a></td>
            </tr>
            <tr>
              <th>Destination Country</th>
              <td>${shippingCountry || 'International'}</td>
            </tr>
            <tr>
              <th>Submission IST Time</th>
              <td>${dateStr}</td>
            </tr>
          </table>

          <div class="notes-box">
            <strong>📝 OEM Customization & Packaging Requirements:</strong><br>
            ${customizationDetails || 'Standard Wholesale & Manufacturing Quotation Requested.'}
          </div>
        </div>
        <div class="footer">
          Received via Kiyan Exports B2B Platform • Transmitted to <strong>${RECIPIENT_EMAIL}</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Kiyan Exports B2B Platform" <${process.env.SMTP_USER || RECIPIENT_EMAIL}>`,
    to: RECIPIENT_EMAIL,
    replyTo: email || RECIPIENT_EMAIL,
    subject: `📦 NEW BULK QUOTATION: ${productName || 'Herbal Product'} (${targetQuantity || '500'} Pcs) - ${companyName || contactName || 'Buyer'}`,
    text: `NEW BULK QUOTATION REQUEST FOR KIYAN EXPORTS\n\nProduct: ${productName}\nQuantity: ${targetQuantity} Pcs\nContact: ${contactName} (${companyName})\nEmail: ${email}\nPhone: ${phone}\nCountry: ${shippingCountry}\nNotes: ${customizationDetails}\nTime: ${dateStr}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ SMTP RFQ Email successfully dispatched to ${RECIPIENT_EMAIL}! MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`⚠️ SMTP Transporter Warning: ${error.message}. Triggering silent FormSubmit API fallback to ${RECIPIENT_EMAIL}.`);
    
    // Trigger silent API background dispatch fallback
    try {
      fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Referer': 'http://localhost:3000'
        },
        body: JSON.stringify({
          _subject: `📦 NEW BULK QUOTATION: ${productName || 'Herbal Product'} (${targetQuantity || '500'} Pcs) - ${companyName || contactName}`,
          Product_Name: productName || 'Herbal Product',
          Target_Quantity: (targetQuantity || '500') + ' Pieces',
          Buyer_Contact_Name: contactName || 'N/A',
          Company_Name: companyName || 'N/A',
          Buyer_Email: email || 'N/A',
          Buyer_Phone_WhatsApp: phone || 'N/A',
          Destination_Country: shippingCountry || 'International',
          Customization_Requirements: customizationDetails || 'Standard Wholesale & Manufacturing Request',
          Submission_Time: dateStr
        })
      }).then(r => r.json()).then(res => console.log('✉️ Silent FormSubmit API Email Result:', res)).catch(e => {});
    } catch (e) {}

    return { success: false, error: error.message };
  }
}

/**
 * Send Rich Formatted B2B Order Email via SMTP
 */
async function sendOrderEmail(orderData) {
  const {
    orderId,
    customerName,
    companyName,
    gstNo,
    customerEmail,
    customerPhone,
    customerAddress,
    paymentMethod,
    paymentStatus,
    financials,
    items,
    status,
    estimatedDelivery
  } = orderData;

  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  const subtotal = financials ? (financials.subtotal || 0) : 0;
  const sgst = financials ? (financials.sgst || 0) : 0;
  const igst = financials ? (financials.igst || 0) : 0;
  const totalPayable = financials ? (financials.totalPayable || 0) : 0;

  // Build items HTML table rows
  let itemsRowsHtml = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsRowsHtml = items.map((item, idx) => {
      const isEven = idx % 2 === 0;
      const bg = isEven ? '#ffffff' : '#fcfbf8';
      const itemTotal = (item.totalPrice || (item.quantity * item.price)) || 0;
      return `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #edf2f0;">
          <td style="padding: 12px 15px; color: #2c3e50; font-weight: 600;">${item.name || 'Herbal Product'}</td>
          <td style="padding: 12px 15px; text-align: center; font-weight: bold; color: #c68b59;">${item.quantity || 1} Pcs</td>
          <td style="padding: 12px 15px; text-align: right; font-weight: 600; color: #555;">₹${item.price || 0}</td>
          <td style="padding: 12px 15px; text-align: right; font-weight: 700; color: #1e4d2b;">₹${itemTotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');
  } else {
    itemsRowsHtml = `
      <tr>
        <td colspan="4" style="padding: 15px; text-align: center; color: #777;">No items listed</td>
      </tr>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f5; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #d8e2dc; }
        .header { background: #1e4d2b; padding: 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 5px 0 0 0; font-size: 13px; color: #d4a373; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 30px; }
        .order-badge { display: inline-block; background: #27ae60; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 15px; }
        .section-title { font-size: 15px; font-weight: 700; color: #1e4d2b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #c68b59; padding-bottom: 5px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table th, .info-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #edf2f0; }
        .info-table th { background: #f9f6f0; color: #1e4d2b; font-weight: 700; width: 35%; font-size: 13px; }
        .info-table td { color: #2c3e50; font-weight: 600; font-size: 14px; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; border: 1px solid #edf2f0; }
        .items-table th { background: #1e4d2b; color: #ffffff; padding: 12px 15px; text-align: left; font-size: 13px; font-weight: 700; }
        .summary-box { background: #fcfbf8; border: 1.5px solid #d4a373; padding: 18px; border-radius: 8px; margin-top: 20px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #555; }
        .summary-total { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 2px dashed #c68b59; font-size: 18px; font-weight: 800; color: #1e4d2b; }
        .notes-box { background: #eef7f6; border-left: 4px solid #1e4d2b; padding: 15px; margin-top: 20px; border-radius: 4px; font-size: 13px; color: #2c3e50; }
        .footer { background: #f9f6f0; padding: 18px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 KIYAN EXPORTS & HERBAL MANUFACTURING</h1>
          <p>Official B2B Wholesale Order Confirmation Dossier</p>
        </div>
        <div class="content">
          <div class="order-badge">🎉 CONFIRMED B2B ORDER: ${orderId}</div>
          <p style="font-size: 14px; color: #555; line-height: 1.5;">
            Thank you for placing your order with <strong>Kiyan Exports</strong>. Our export manufacturing team has received your order and is preparing the proforma invoice & dispatch manifest.
          </p>

          <div class="section-title">📋 Customer & Buyer Information</div>
          <table class="info-table">
            <tr>
              <th>Order ID</th>
              <td><strong style="color: #1e4d2b;">${orderId}</strong></td>
            </tr>
            <tr>
              <th>Buyer Name</th>
              <td>${customerName || 'Valued Buyer'}</td>
            </tr>
            <tr>
              <th>Company / Brand</th>
              <td>${companyName || 'N/A'}</td>
            </tr>
            <tr>
              <th>GST / Tax ID</th>
              <td>${gstNo || 'N/A'}</td>
            </tr>
            <tr>
              <th>Email Address</th>
              <td><a href="mailto:${customerEmail}">${customerEmail}</a></td>
            </tr>
            <tr>
              <th>Contact Phone</th>
              <td><a href="tel:${customerPhone}">${customerPhone || 'N/A'}</a></td>
            </tr>
            <tr>
              <th>Delivery Address</th>
              <td>${customerAddress || 'Standard Delivery'}</td>
            </tr>
            <tr>
              <th>Payment Method</th>
              <td>${paymentMethod || 'Bank Wire Transfer / LC'}</td>
            </tr>
            <tr>
              <th>Order Status</th>
              <td><span style="color: #27ae60; font-weight: bold;">${status || 'Confirmed B2B Order'}</span></td>
            </tr>
            <tr>
              <th>Estimated Dispatch</th>
              <td>${estimatedDelivery || '7-10 Days (Port Dispatch)'}</td>
            </tr>
            <tr>
              <th>Order Timestamp</th>
              <td>${dateStr}</td>
            </tr>
          </table>

          <div class="section-title">📦 Ordered Products Breakdown</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal:</span>
              <strong style="color: #333;">₹${subtotal.toLocaleString('en-IN')}</strong>
            </div>
            <div class="summary-row">
              <span>SGST (9%):</span>
              <strong style="color: #666;">₹${sgst.toLocaleString('en-IN')}</strong>
            </div>
            <div class="summary-row">
              <span>IGST (9%):</span>
              <strong style="color: #666;">₹${igst.toLocaleString('en-IN')}</strong>
            </div>
            <div class="summary-total">
              <span>Total Payable Amount:</span>
              <span>₹${totalPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="notes-box">
            <strong>ℹ️ Next Steps & Proforma Invoice Notice:</strong><br>
            Our accounts & export logistics department will send you the official Proforma Invoice (PI) along with bank wire details (NEFT/RTGS/Swift). If you need custom packaging, label printing, or COA documents, please reply directly to this email.
          </div>
        </div>

        <div class="footer">
          Kiyan Exports • Herbal Extracts, Private Label & Bulk Manufacturing<br>
          Sent to <strong>${customerEmail}</strong> & Admin Copy <strong>${RECIPIENT_EMAIL}</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  const recipients = Array.from(new Set([RECIPIENT_EMAIL, customerEmail])).filter(Boolean).join(', ');

  const mailOptions = {
    from: `"Kiyan Exports Orders" <${process.env.SMTP_USER || RECIPIENT_EMAIL}>`,
    to: recipients,
    replyTo: customerEmail || RECIPIENT_EMAIL,
    subject: `🛒 CONFIRMED B2B ORDER #${orderId} - ₹${totalPayable.toLocaleString('en-IN')} (${companyName || customerName})`,
    text: `B2B ORDER CONFIRMATION #${orderId}\nBuyer: ${customerName} (${companyName})\nEmail: ${customerEmail}\nTotal Payable: ₹${totalPayable}\nStatus: ${status}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ SMTP Order Confirmation Email dispatched to ${recipients}! MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`⚠️ SMTP Transporter Warning for Order #${orderId}: ${error.message}. Triggering FormSubmit API fallback.`);
    try {
      fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Referer': 'http://localhost:3000'
        },
        body: JSON.stringify({
          _subject: `🛒 CONFIRMED B2B ORDER #${orderId} - ₹${totalPayable.toLocaleString('en-IN')} (${companyName || customerName})`,
          Order_ID: orderId,
          Buyer_Name: customerName || 'N/A',
          Company: companyName || 'N/A',
          GST_ID: gstNo || 'N/A',
          Email: customerEmail,
          Phone: customerPhone || 'N/A',
          Address: customerAddress,
          Total_Payable: `₹${totalPayable.toLocaleString('en-IN')}`,
          Order_Items: JSON.stringify(items),
          Order_Time: dateStr
        })
      }).then(r => r.json()).then(res => console.log('✉️ Silent FormSubmit Order Email Result:', res)).catch(e => {});
    } catch (e) {}

    return { success: false, error: error.message };
  }
}

module.exports = {
  transporter,
  sendRfqEmail,
  sendOrderEmail,
  RECIPIENT_EMAIL
};
