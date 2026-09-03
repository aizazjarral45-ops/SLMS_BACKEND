const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  eventType: {
    type: String,
    enum: [
      'SIGN_UP', 'SIGNUP', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
      'ACCOUNT_LOCKOUT', 'ACCOUNT_UNLOCK', 'PASSWORD_RESET', 'PASSWORD_RESET_SUCCESS',
    ],
    default: 'LOGIN_SUCCESS',
    index: true,
  },
  status: {
    type: String,
    enum: [
      'success', 'failed', 'logout', 'account_created',
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'SIGN_UP', 'SIGNUP', 'LOGOUT',
      'ACCOUNT_LOCKOUT', 'ACCOUNT_UNLOCK', 'PASSWORD_RESET', 'PASSWORD_RESET_SUCCESS',
    ],
    default: 'success',
    index: true,
  },
  sessionId: { type: String, default: '', index: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

loginHistorySchema.index({ userId: 1, createdAt: -1 });
loginHistorySchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
