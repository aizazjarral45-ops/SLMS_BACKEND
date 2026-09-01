const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  email: { type: String, lowercase: true, trim: true },
  status: { type: String, enum: ['success', 'failed', 'logout', 'account_created'], required: true },
  sessionId: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
