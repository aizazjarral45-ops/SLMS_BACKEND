const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  code: { type: String, required: true, trim: true, maxlength: 30 },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  instructor: { type: String, trim: true, default: '', maxlength: 150 },
  credits: { type: Number, min: 0, max: 30, default: 3 },
}, { timestamps: true, strict: true });

courseSchema.index({ userId: 1, code: 1 });
module.exports = mongoose.model('Course', courseSchema);
