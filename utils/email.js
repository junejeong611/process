const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST && process.env.EMAIL_HOST.trim(),
  port: Number(process.env.EMAIL_PORT && process.env.EMAIL_PORT.trim()),
  secure: false, // true for 465, false for 587 and others
  auth: {
    user: process.env.EMAIL_USER && process.env.EMAIL_USER.trim(),
    pass: process.env.EMAIL_PASS && process.env.EMAIL_PASS.trim()
  }
});

async function sendEmail({ to, subject, text, html }) {
  console.log('Nodemailer config at send time:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  });
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail }; 