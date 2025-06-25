const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    // --- Diagnostic Logging ---
    console.log("📧 Initializing Nodemailer transporter with the following config:");
    console.log(`   - Host: ${process.env.EMAIL_HOST}`);
    console.log(`   - Port: ${process.env.EMAIL_PORT}`);
    console.log(`   - User: ${process.env.EMAIL_USER}`);
    console.log(`   - Pass: ${process.env.EMAIL_PASS ? '[SET]' : '[NOT SET]'}`); // Don't log the actual password
    console.log(`   - From: ${process.env.EMAIL_FROM}`);
    // --- End Diagnostic Logging ---

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for 587 and others
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter(); // Get the transporter instance

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html
  };

  console.log("📨 Attempting to send email...");
  try {
    const info = await mailer.sendMail(mailOptions);
    
    console.log("✅ Mail server responded:", info);

    // Explicitly check for rejections in the response
    if (info.rejected && info.rejected.length > 0) {
      throw new Error(`Email was rejected by the server for recipient: ${info.rejected[0]}`);
    }

    return info; // Return the full info object on success
  } catch (error) {
    console.error("❌ Nodemailer sendMail function caught an error:", error.message);
    // Re-throw the error to be caught by the calling route handler
    throw error;
  }
}

module.exports = { sendEmail }; 