const mongoose = require('mongoose');

const accountDeletionRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0, min: 0 },
  lastSentAt: { type: Date, required: true },
  sendWindowStartedAt: { type: Date, required: true },
  sendsInWindow: { type: Number, default: 1, min: 0 },
  passwordVerifiedAt: { type: Date, default: null },
  consumedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('AccountDeletionRequest', accountDeletionRequestSchema);
