const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0, min: 0 },
  lastSentAt: { type: Date, required: true },
  consumedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
