const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin', 'super_admin'], default: 'student' },
  permissions: [{ type: String }],
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' },
  isEmailVerified: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  lastLoginAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: Date.now },
  profile: {
    studentId: { type: String, default: '' },
    program: { type: String, default: '' },
    semester: { type: String, default: '' },
    batch: { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
