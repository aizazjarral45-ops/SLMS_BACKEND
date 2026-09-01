const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  course: { type: String, trim: true, default: '', maxlength: 150 },
  examDate: { type: String, required: true, trim: true },
  venue: { type: String, trim: true, default: '', maxlength: 200 },
}, { timestamps: true, strict: true });

module.exports = mongoose.model('Exam', examSchema);
