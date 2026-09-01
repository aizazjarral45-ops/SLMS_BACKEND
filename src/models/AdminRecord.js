const mongoose = require('mongoose');

const adminRecordSchema = new mongoose.Schema({
  scope: { type: String, required: true, trim: true, index: true },
  recordId: { type: String, required: true, trim: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

adminRecordSchema.index({ scope: 1, recordId: 1 }, { unique: true });
module.exports = mongoose.model('AdminRecord', adminRecordSchema);
