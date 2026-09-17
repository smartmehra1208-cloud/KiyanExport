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

async function run() {
  console.log('Connecting to cPanel SMTP...');
  const info = await transporter.sendMail({
    from: '"Kiyan Export" <info@kiyanexports.com>',
    to: 'kiyanexports.express@gmail.com',
    subject: '🌿 Official Test from info@kiyanexports.com',
    html: '<div style="font-family: Arial, sans-serif; padding: 25px; border: 2px solid #1a4d2e; border-radius: 8px; max-width: 600px;"><h2 style="color: #1a4d2e; margin-top: 0;">🌿 Kiyan Export - Official cPanel Mail Working!</h2><p style="font-size: 15px;">This email was sent directly through your official cPanel SMTP server: <strong>sg2plzcpnl505501.prod.sin2.secureserver.net</strong></p><p style="font-size: 14px;"><strong>From:</strong> info@kiyanexports.com<br><strong>To:</strong> kiyanexports.express@gmail.com</p><p style="color: #27ae60; font-weight: bold;">Sender is 100% official info@kiyanexports.com with NO personal email attached!</p></div>',
    text: 'Official test from info@kiyanexports.com'
  });
  console.log('SUCCESS! Email sent from info@kiyanexports.com! MessageId:', info.messageId);
}

run().catch(err => console.error('FAILED:', err.message));
