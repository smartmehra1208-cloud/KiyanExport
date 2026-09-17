<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST method allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) {
    $data = $_POST;
}

$productName = isset($data['productName']) ? htmlspecialchars($data['productName']) : 'Herbal Extract';
$companyName = isset($data['companyName']) ? htmlspecialchars($data['companyName']) : 'N/A';
$contactName = isset($data['contactName']) ? htmlspecialchars($data['contactName']) : 'Valued Buyer';
$email = isset($data['email']) ? filter_var($data['email'], FILTER_SANITIZE_EMAIL) : '';
$phone = isset($data['phone']) ? htmlspecialchars($data['phone']) : 'N/A';
$targetQuantity = isset($data['targetQuantity']) ? htmlspecialchars($data['targetQuantity']) : '500';
$shippingCountry = isset($data['shippingCountry']) ? htmlspecialchars($data['shippingCountry']) : 'International';
$customization = isset($data['customizationDetails']) ? htmlspecialchars($data['customizationDetails']) : (isset($data['message']) ? htmlspecialchars($data['message']) : '');

$to = 'info@kiyanexports.com, kiyanexports.express@gmail.com';
$subject = isset($data['subject']) && !empty($data['subject']) ? $data['subject'] : ('🛒 [NEW RFQ QUOTE]: ' . $productName . ' (' . $targetQuantity . ' Pcs) - ' . ($companyName !== 'N/A' ? $companyName : $contactName));

// Use client HTML card if passed, or default Photo 2 card
$html = isset($data['html']) && !empty($data['html']) ? $data['html'] : '';
if (empty($html)) {
    $logoUrl = 'https://res.cloudinary.com/arkc76lz/image/upload/KIyan_export.jpg.jpg';
    $time = date('d/m/Y, h:i A') . ' IST';
    $html = '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f2; margin: 0; padding: 25px 10px; color: #111111;">' .
      '<div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e7e7e7;">' .
        '<div style="padding: 25px 30px 20px 30px; background: #ffffff; border-bottom: 1px solid #eeeeee; text-align: center;">' .
          '<img src="' . $logoUrl . '" alt="Kiyan Export" style="margin: 0 auto 16px auto; display: block; max-height: 60px; width: auto; border: none;">' .
          '<div style="font-size: 20px; font-weight: 700; color: #111111; margin-bottom: 8px;">Hello ' . $contactName . ',</div>' .
          '<div style="font-size: 14px; color: #333333; line-height: 1.6; margin-bottom: 14px;">' .
            'Thank you for reaching out to <strong>Kiyan Export & Herbal Manufacturing</strong>. We have received your wholesale quotation request. Our export manufacturing team will review your specifications and issue an official Proforma Invoice shortly.' .
          '</div>' .
          '<div style="font-size: 16px; font-weight: 800; color: #111111; letter-spacing: 0.5px; margin-top: 10px;">Bulk Quotation Request: ' . $productName . '</div>' .
        '</div>' .
        '<div style="background: #ffffff; border: 1px solid #e7e7e7; border-radius: 8px; margin: 20px 25px; padding: 20px 25px;">' .
          '<table style="width: 100%; border-collapse: collapse;">' .
            '<tr>' .
              '<td style="width: 50%; vertical-align: top; padding-right: 15px;">' .
                '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Target Order Quantity:</div>' .
                '<div style="font-size: 16px; font-weight: 700; color: #e67e00; margin-bottom: 14px;">' . $targetQuantity . ' Pieces</div>' .
                '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Destination Country:</div>' .
                '<div style="font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px;">' . $shippingCountry . '</div>' .
                '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Submission IST Timestamp:</div>' .
                '<div style="font-size: 12px; color: #333; font-weight: 600;">' . $time . '</div>' .
              '</td>' .
              '<td style="width: 50%; vertical-align: top; text-align: left;">' .
                '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Buyer Contact Name:</div>' .
                '<div style="font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px;">' . $contactName . '</div>' .
                '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Company / Brand Name:</div>' .
                '<div style="font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 14px;">' . $companyName . '</div>' .
                '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Email & WhatsApp:</div>' .
                '<div style="font-size: 12px; color: #0066c0; font-weight: 700;">' . $email . ' • ' . $phone . '</div>' .
              '</td>' .
            '</tr>' .
            (!empty($customization) ? (
            '<tr>' .
              '<td colspan="2" style="padding-top: 15px; border-top: 1px dashed #dddddd;">' .
                '<div style="font-size: 12px; color: #666666; margin-bottom: 4px;">Custom Packaging / OEM Specifications:</div>' .
                '<div style="font-size: 13px; color: #222222; background: #f9f9f9; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #ff9900;">' .
                  $customization .
                '</div>' .
              '</td>' .
            '</tr>'
            ) : '') .
          '</table>' .
        '</div>' .
        '<div style="padding: 25px 30px; background: #ffffff; text-align: center; font-size: 11px; color: #777777; line-height: 1.7; border-top: 1px solid #eeeeee;">' .
          '<div>This automated notification was generated by Kiyan Export Wholesale Order System.</div>' .
          '<div style="font-weight: 700; font-size: 13px; color: #111111; margin-top: 12px;">Kiyan Export & Herbal Manufacturing Plant</div>' .
          '<div>IEC: 0514092811 • US-FDA Reg: 17824910284 • FSSAI License: 12721001000452</div>' .
        '</div>' .
      '</div>' .
    '</div>';
}

$senderName = !empty($contactName) ? $contactName : 'Kiyan Export Buyer';
if (!empty($email)) {
    $senderName .= ' (' . $email . ')';
}

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/html; charset=UTF-8';
$headers[] = 'From: ' . $senderName . ' <info@kiyanexports.com>';
if (!empty($email)) {
    $headers[] = 'Reply-To: ' . $email;
}
$headers[] = 'X-Mailer: PHP/' . phpversion();

$mailSent = @mail($to, $subject, $html, implode("\r\n", $headers));

echo json_encode([
    'success' => $mailSent,
    'message' => $mailSent ? 'Email sent successfully via cPanel Mailer' : 'Dispatched',
    'from' => $senderName,
    'to' => $to
]);
?>
