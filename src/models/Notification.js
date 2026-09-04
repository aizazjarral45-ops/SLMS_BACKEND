const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sourceUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'general' },
  module: { type: String, default: 'general' },
  isRead: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  relatedModel: { type: String, default: '' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel', default: null },
  navigationTarget: { type: String, default: '' },
  priority: { type: String, default: 'normal' },
  dedupeKey: { type: String, default: null },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index(
  { recipientId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

module.exports = mongoose.model('Notification', notificationSchema);
