const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicationNo: { type: String, default: '' },
  fullName: { type: String, required: true },
  studentId: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  gender: { type: String, default: '' },
  program: { type: String, default: '' },
  semester: { type: String, default: '' },
  guardianName: { type: String, default: '' },
  guardianPhone: { type: String, default: '' },
  emergencyName: { type: String, default: '' },
  emergencyPhone: { type: String, default: '' },
  status: { type: String, enum: ['Submitted', 'Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Submitted' },
  submittedAt: { type: Date, default: Date.now },
  feesPerSemester: { type: Number, default: 0 },
  feesPaidThisMonth: { type: Number, default: 0 },
  paymentDueDate: { type: String, default: '' },
  feesStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
