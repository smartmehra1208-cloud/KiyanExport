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

module.exports = {
  transporter,
  sendRfqEmail,
  RECIPIENT_EMAIL
};
