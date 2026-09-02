const nodemailer = require('nodemailer');
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  const port = Number(EMAIL_PORT);
  if (!EMAIL_HOST || !Number.isInteger(port) || port < 1 || port > 65535 || !EMAIL_USER || !EMAIL_PASSWORD) return null;
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  });
  return transporter;
}
async function sendPasswordResetOtp(email, otp) {
  const mailer = getTransporter();
  if (!mailer) throw Object.assign(new Error('Email delivery is not configured. Ask an administrator to configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASSWORD.'), { statusCode: 503 });
  await mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'SLMS password reset request',
    text: `A password reset was requested for your SLMS account.\n\nYour 6-digit OTP is: ${otp}\nThis OTP expires in 10 minutes.\n\nIf you did not request this reset, please ignore this email and contact your administrator.`,
  });
}
module.exports = { sendPasswordResetOtp };
