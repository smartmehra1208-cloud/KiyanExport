/**
 * =========================================================================
 * KIYAN EXPORT - OFFICIAL GOOGLE APPS SCRIPT MAIL ENGINE
 * =========================================================================
 * Delivers directly to: info@kiyanexports.com, kiyanexports.express@gmail.com
 * Formats email with Amazon/Executive Kiyan Export Card (Photo 2)
 * Sets sender display name to Buyer's Name + Gmail and reply-to to Buyer.
 * =========================================================================
 */

var OFFICIAL_ADMIN_EMAIL = "info@kiyanexports.com, kiyanexports.express@gmail.com";
var LOGO_URL = "https://res.cloudinary.com/arkc76lz/image/upload/KIyan_export.jpg.jpg";

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
    var to = data.to || OFFICIAL_ADMIN_EMAIL;
    var contactName = data.contactName || data.customerName || data.name || "Valued Buyer";
    var buyerEmail = data.email || data.replyTo || "";
    var buyerPhone = data.phone || "N/A";
    var compName = data.companyName || "N/A";
    var prodName = data.productName || "Herbal Extract";
    var qty = data.targetQuantity || "500";
    var shippingCountry = data.shippingCountry || "International";
    var customizationDetails = data.customizationDetails || data.message || "";

    // 1. Construct Subject
    var subject = data.subject || "";
    if (!subject) {
      if (type === "rfq" || data.productName) {
        subject = "🛒 [NEW RFQ QUOTE]: " + prodName + " (" + qty + " Pcs) - " + (compName !== "N/A" ? compName : contactName);
      } else if (type === "order" || data.orderId) {
        subject = "📦 [NEW ORDER]: #" + (data.orderId || "KYN-ORDER") + " - " + contactName;
      } else if (type === "contact") {
        subject = "✉️ [CONTACT INQUIRY]: " + (data.subject || "General Inquiry") + " - " + contactName;
      } else {
        subject = "🛒 [NEW RFQ QUOTE]: " + prodName + " (" + qty + " Pcs) - " + contactName;
      }
    }

    // 2. Sender Display Name (Shows Buyer's Name & Gmail in From column of inbox)
    var senderDisplayName = data.fromName || data.name || (contactName + (buyerEmail ? " (" + buyerEmail + ")" : ""));
    var replyToEmail = buyerEmail || "info@kiyanexports.com";

    // 3. Construct HTML Card Body (Exact Photo 2 match)
    var htmlBody = data.html || "";
    if (!htmlBody) {
      if (type === "rfq" || data.productName || !data.orderId) {
        htmlBody = buildRfqEmailHtml({
          productName: prodName,
          companyName: compName,
          contactName: contactName,
          email: buyerEmail,
          phone: buyerPhone,
          targetQuantity: qty,
          shippingCountry: shippingCountry,
          customizationDetails: customizationDetails
        });
      } else if (type === "order" || data.orderId) {
        htmlBody = buildOrderEmailHtml(data);
      }
    }

    var textBody = data.text || (
      "New RFQ Quote Request\nProduct: " + prodName + "\nQuantity: " + qty + "\nBuyer: " + contactName + "\nCompany: " + compName + "\nEmail: " + buyerEmail + "\nPhone: " + buyerPhone + "\nCountry: " + shippingCountry
    );

    // 4. Dispatch Email via GmailApp
    GmailApp.sendEmail(to, subject, textBody, {
      htmlBody: htmlBody,
      name: senderDisplayName,
      replyTo: replyToEmail
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Email successfully dispatched to " + to,
      subject: subject,
      sender: senderDisplayName
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

/**
 * Amazon / Executive Style Card Matching Photo 2 Exactly
 */
function buildRfqEmailHtml(d) {
  var prod = d.productName || "Herbal Extract";
  var comp = d.companyName || "N/A";
  var name = d.contactName || "Valued Buyer";
  var email = d.email || "N/A";
  var phone = d.phone || "N/A";
  var qty = d.targetQuantity || "500";
  var country = d.shippingCountry || "International";
  var details = d.customizationDetails || "";
  var time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";

  return '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f2; margin: 0; padding: 25px 10px; color: #111111;">' +
    '<div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e7e7e7;">' +
      '<div style="padding: 25px 30px 20px 30px; background: #ffffff; border-bottom: 1px solid #eeeeee; text-align: center;">' +
        '<img src="' + LOGO_URL + '" alt="Kiyan Export" style="margin: 0 auto 16px auto; display: block; max-height: 60px; width: auto; border: none;">' +
        '<div style="font-size: 20px; font-weight: 700; color: #111111; margin-bottom: 8px;">Hello ' + name + ',</div>' +
        '<div style="font-size: 14px; color: #333333; line-height: 1.6; margin-bottom: 14px;">' +
          'Thank you for reaching out to <strong>Kiyan Export & Herbal Manufacturing</strong>. We have received your wholesale quotation request. Our export manufacturing team will review your specifications and issue an official Proforma Invoice shortly.' +
        '</div>' +
        '<div style="font-size: 16px; font-weight: 800; color: #111111; letter-spacing: 0.5px; margin-top: 10px;">Bulk Quotation Request: ' + prod + '</div>' +
      '</div>' +

      '<div style="background: #ffffff; border: 1px solid #e7e7e7; border-radius: 8px; margin: 20px 25px; padding: 20px 25px;">' +
        '<table style="width: 100%; border-collapse: collapse;">' +
          '<tr>' +
            '<td style="width: 50%; vertical-align: top; padding-right: 15px;">' +
              '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Target Order Quantity:</div>' +
              '<div style="font-size: 16px; font-weight: 700; color: #e67e00; margin-bottom: 14px;">' + qty + ' Pieces</div>' +
              
              '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Destination Country:</div>' +
              '<div style="font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px;">' + country + '</div>' +

              '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Submission IST Timestamp:</div>' +
              '<div style="font-size: 12px; color: #333; font-weight: 600;">' + time + '</div>' +
            '</td>' +
            '<td style="width: 50%; vertical-align: top; text-align: left;">' +
              '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Buyer Contact Name:</div>' +
              '<div style="font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px;">' + name + '</div>' +

              '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Company / Brand Name:</div>' +
              '<div style="font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px;">' + comp + '</div>' +
              
              '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Email & WhatsApp:</div>' +
              '<div style="font-size: 12px; color: #0066c0; font-weight: 700;">' + email + ' • ' + phone + '</div>' +
            '</td>' +
          '</tr>' +
          (details ? (
          '<tr>' +
            '<td colspan="2" style="padding-top: 15px; border-top: 1px dashed #dddddd;">' +
              '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Custom Packaging / OEM Specifications:</div>' +
              '<div style="font-size: 13px; color: #222222; background: #f9f9f9; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #ff9900;">' +
                details +
              '</div>' +
            '</td>' +
          '</tr>'
          ) : '') +
        '</table>' +
      '</div>' +

      '<div style="padding: 25px 30px; background: #ffffff; text-align: center; font-size: 11px; color: #777777; line-height: 1.7; border-top: 1px solid #eeeeee;">' +
        '<div>This automated notification was generated by Kiyan Export Wholesale Order System.</div>' +
        '<div style="font-weight: 700; font-size: 13px; color: #111111; margin-top: 12px;">Kiyan Export & Herbal Manufacturing Plant</div>' +
        '<div>IEC: 0514092811 • US-FDA Reg: 17824910284 • FSSAI License: 12721001000452</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function buildOrderEmailHtml(d) {
  var id = d.orderId || "KYN-ORDER";
  var name = d.customerName || "Customer";
  var total = d.totalPayable || d.subtotal || "0";
  var time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";

  return '<div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 25px 10px;">' +
    '<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border-top: 5px solid #d4af37;">' +
      '<div style="padding: 25px 30px; text-align: center; background: #1a4d2e; color: #ffffff;">' +
        '<h2 style="margin: 0; color: #ffffff;">🌿 KIYAN EXPORT</h2>' +
        '<p style="margin: 5px 0 0 0; color: #d4af37; font-weight: bold;">New Order Placed #' + id + '</p>' +
      '</div>' +
      '<div style="padding: 25px 30px;">' +
        '<p>A new order has been received on Kiyan Export!</p>' +
        '<p><strong>Customer:</strong> ' + name + '</p>' +
        '<p><strong>Order ID:</strong> #' + id + '</p>' +
        '<p><strong>Total Amount:</strong> ₹' + total + '</p>' +
        '<p><strong>Time:</strong> ' + time + '</p>' +
      '</div>' +
    '</div>' +
  '</div>';
}
