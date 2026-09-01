const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  previousStatus: { type: String, default: '' },
  newStatus: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changedByRole: { type: String, default: 'student' },
  reason: { type: String, default: '' },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
