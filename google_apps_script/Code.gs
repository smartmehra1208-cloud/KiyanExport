/**
 * =========================================================================
 * KIYAN EXPORT - OFFICIAL GOOGLE APPS SCRIPT MAIL ENGINE
 * =========================================================================
 * Runs 100% on Google Cloud Infrastructure (0% SMTP port blocking).
 * Receives RFQs, Orders, and Contact messages from Kiyan Export website
 * and delivers directly to: kiyanexports.express@gmail.com
 * =========================================================================
 */

var OFFICIAL_ADMIN_EMAIL = "kiyanexports.express@gmail.com";

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = {};
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      data = (e && e.parameter) ? e.parameter : {};
    }

    var type = data.type || "general";
    var to = OFFICIAL_ADMIN_EMAIL;
    var subject = data.subject || "New Notification - Kiyan Export";
    var htmlBody = data.html || "";
    var textBody = data.text || "";

    // 1. If it is an RFQ (Bulk Quotation Request)
    if (type === "rfq" || data.productName) {
      subject = "🛒 [BULK RFQ QUOTE]: " + (data.productName || "Herbal Extract") + " (" + (data.targetQuantity || "500") + " Pcs) - " + (data.companyName || data.contactName || "Buyer");
      htmlBody = buildRfqEmailHtml(data);
    } 
    // 2. If it is an Order Confirmation
    else if (type === "order" || data.orderId) {
      subject = "📦 [NEW ORDER]: #" + (data.orderId || "KYN-ORDER") + " - " + (data.customerName || "Customer");
      htmlBody = data.html || buildOrderEmailHtml(data);
    }

    // Dispatch Email via GmailApp
    GmailApp.sendEmail(to, subject, textBody, {
      htmlBody: htmlBody,
      name: "Kiyan Export B2B",
      replyTo: data.email || data.replyTo || OFFICIAL_ADMIN_EMAIL
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Email successfully dispatched to " + to
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Kiyan Export Mail Engine",
    officialEmail: OFFICIAL_ADMIN_EMAIL,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function buildRfqEmailHtml(d) {
  var prod = d.productName || "Herbal Extract";
  var comp = d.companyName || "N/A";
  var name = d.contactName || "Buyer";
  var email = d.email || "N/A";
  var phone = d.phone || "N/A";
  var qty = d.targetQuantity || "500";
  var country = d.shippingCountry || "International";
  var details = d.customizationDetails || "Standard Export Packaging";
  var time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return '<div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 25px 10px; margin: 0;">' +
    '<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border-top: 5px solid #1a4d2e;">' +
      '<div style="background: #1a4d2e; padding: 25px 30px; text-align: center; color: #ffffff;">' +
        '<h1 style="margin: 0; font-size: 22px; letter-spacing: 1px; color: #ffffff;">🌿 KIYAN EXPORT</h1>' +
        '<p style="margin: 5px 0 0 0; color: #d4af37; font-size: 13px; font-weight: bold; text-transform: uppercase;">New Bulk Quotation Inquiry Received</p>' +
      '</div>' +
      '<div style="padding: 25px 30px;">' +
        '<p style="font-size: 15px; color: #333333; margin-top: 0;">A new buyer has submitted a bulk inquiry on your website:</p>' +
        '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">' +
          '<tr style="background: #f9fbf9;"><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #1a4d2e; width: 40%;">Product:</td><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #111111;">' + prod + '</td></tr>' +
          '<tr><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #555555;">Target Quantity:</td><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; color: #b12704; font-weight: bold;">' + qty + ' Pcs</td></tr>' +
          '<tr style="background: #f9fbf9;"><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #555555;">Buyer Name:</td><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; color: #111111;">' + name + '</td></tr>' +
          '<tr><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #555555;">Company Name:</td><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; color: #111111;">' + comp + '</td></tr>' +
          '<tr style="background: #f9fbf9;"><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #555555;">Buyer Email:</td><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; color: #0066c0; font-weight: bold;"><a href="mailto:' + email + '">' + email + '</a></td></tr>' +
          '<tr><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #555555;">Buyer Phone:</td><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; color: #111111;">' + phone + '</td></tr>' +
          '<tr style="background: #f9fbf9;"><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #555555;">Destination Country:</td><td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; color: #111111;">' + country + '</td></tr>' +
          '<tr><td style="padding: 10px 15px; font-weight: bold; color: #555555; vertical-align: top;">Notes / Customization:</td><td style="padding: 10px 15px; color: #333333; line-height: 1.5;">' + details + '</td></tr>' +
        '</table>' +
        '<div style="text-align: center; margin-top: 25px;">' +
          '<a href="mailto:' + email + '?subject=Quotation for ' + encodeURIComponent(prod) + ' - Kiyan Export" style="display: inline-block; background: #1a4d2e; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 14px;">Reply to Buyer</a>' +
        '</div>' +
      '</div>' +
      '<div style="background: #f9fbf9; border-top: 1px solid #eeeeee; padding: 15px 30px; text-align: center; font-size: 12px; color: #777777;">' +
        'Inquiry logged at: ' + time + '<br><strong>Kiyan Export B2B Portal</strong>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function buildOrderEmailHtml(d) {
  var id = d.orderId || "KYN-ORDER";
  var name = d.customerName || "Customer";
  var total = d.totalPayable || d.subtotal || "0";
  var time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return '<div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 25px 10px;">' +
    '<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border-top: 5px solid #d4af37;">' +
      '<div style="padding: 25px 30px; text-align: center; background: #1a4d2e; color: #ffffff;">' +
        '<h2 style="margin: 0; color: #ffffff;">🌿 KIYAN EXPORT</h2>' +
        '<p style="margin: 5px 0 0 0; color: #d4af37; font-weight: bold;">New Order Placed #' + id + '</p>' +
      '</div>' +
      '<div style="padding: 25px 30px;">' +
        '<p>A new order has been received on Kiyan Export!</p>' +
        '<p><strong>Customer:</strong> ' + name + '</p>' +
        '<p><strong>Order ID:</strong> ' + id + '</p>' +
        '<p><strong>Total Amount:</strong> ₹' + total + '</p>' +
      '</div>' +
    '</div>' +
  '</div>';
}
