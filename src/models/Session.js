const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, unique: true },
  tokenVersion: { type: Number, default: 1 },
  deviceInfo: { type: String, default: '' },
  browser: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'expired', 'logged_out'], default: 'active' },
  loginAt: { type: Date, default: Date.now },
  lastActivityAt: { type: Date, default: Date.now },
  logoutAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
