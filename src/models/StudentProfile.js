const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  studentId: { type: String, default: '' },
  fullName: { type: String, default: '' },
  fatherName: { type: String, default: '' },
  gender: { type: String, default: '' },
  dob: { type: Date, default: null },
  cnic: { type: String, default: '' },
  bloodGroup: { type: String, default: '' },
  nationality: { type: String, default: '' },
  maritalStatus: { type: String, default: 'Single' },
  universityEmail: { type: String, default: '' },
  personalEmail: { type: String, default: '' },
  phone: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  currentAddress: { type: String, default: '' },
  permanentAddress: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  program: { type: String, default: '' },
  semester: { type: String, default: '' },
  batch: { type: String, default: '' },
  cgpa: { type: Number, default: 0 },
  department: { type: String, default: '' },
  sessions: { type: String, default: '' },
  rollNo: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
