const nodemailer = require("nodemailer");
let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  const port = Number(EMAIL_PORT);
  if (
    !EMAIL_HOST ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !EMAIL_USER ||
    !EMAIL_PASSWORD
  )
    return null;
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
  if (!mailer)
    throw Object.assign(
      new Error(
        "Email delivery is not configured. Ask an administrator to configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASSWORD.",
      ),
      { statusCode: 503 },
    );
  await mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "SLMS Password Reset Verification Code",
    text: `Hello,\n\nWe received a request to reset the password for your SLMS account.\n\nAccount email: ${email}\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes. For your security, please do not share it with anyone.\n\nIf you did not request a password reset, no action is required. Please contact your system administrator if you believe your account may be at risk.\n\nRegards,\nSLMS Support Team`,
    html: `
      <div style="margin:0;padding:40px 16px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
        <div style="max-width:600px;margin:0 auto;overflow:hidden;background:#fff;border:1px solid #e5eaf2;border-radius:16px;box-shadow:0 8px 24px rgba(23,32,51,.08);">
          <div style="padding:30px 36px;background:#173b8f;color:#fff;">
            <div style="font-size:13px;font-weight:bold;letter-spacing:2px;opacity:.85;">SLMS</div>
            <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;">Password reset verification</h1>
          </div>
          <div style="padding:36px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello,</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#526077;">We received a request to reset the password for your SLMS account. Use the verification code below to continue.</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#526077;"><strong style="color:#172033;">Account email:</strong> ${email}</p>
            <div style="margin:0 0 26px;padding:22px;text-align:center;background:#eef4ff;border:1px solid #d8e5ff;border-radius:12px;">
              <div style="margin-bottom:8px;color:#526077;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">Your verification code</div>
              <div style="color:#173b8f;font-size:34px;font-weight:bold;letter-spacing:8px;line-height:1.2;">${otp}</div>
            </div>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#526077;"><strong style="color:#172033;">This code expires in 10 minutes.</strong> For your security, please do not share it with anyone.</p>
            <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #edf0f5;font-size:13px;line-height:1.6;color:#7a8699;">If you did not request a password reset, no action is required. Contact your system administrator if you believe your account may be at risk.</p>
          </div>
          <div style="padding:20px 36px;background:#f8fafc;color:#7a8699;font-size:12px;line-height:1.5;">Regards,<br><strong style="color:#526077;">SLMS Support Team</strong></div>
        </div>
      </div>`,
  });
}
module.exports = { sendPasswordResetOtp };
