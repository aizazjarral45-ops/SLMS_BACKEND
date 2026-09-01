const nodemailer = require('nodemailer');
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) return null;
  transporter = nodemailer.createTransport({ host: EMAIL_HOST, port: Number(EMAIL_PORT), secure: Number(EMAIL_PORT) === 465, auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD } });
  return transporter;
}
async function sendPasswordResetOtp(email, otp) {
  const mailer = getTransporter();
  if (!mailer) throw Object.assign(new Error('Email delivery is not configured. Ask an administrator to configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASSWORD.'), { statusCode: 503 });
  await mailer.sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to: email, subject: 'SLMS password reset code', text: `Your SLMS password reset code is ${otp}. It expires in 10 minutes.` });
}
module.exports = { sendPasswordResetOtp };
