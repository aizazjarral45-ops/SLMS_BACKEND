const mongoose = require('mongoose');

const academicProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  program: { type: String, trim: true, default: '' },
  semester: { type: String, trim: true, default: '' },
  cgpa: { type: Number, min: 0, max: 4, default: 0 },
  department: { type: String, trim: true, default: '' },
  batch: { type: String, trim: true, default: '' },
}, { timestamps: true, strict: true });

module.exports = mongoose.model('AcademicProfile', academicProfileSchema);
