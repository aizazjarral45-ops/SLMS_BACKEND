const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['Academic', 'Hostel', 'IT', 'Library', 'Transport', 'Administration', 'Medical', 'Other'], default: 'Other' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  description: { type: String, required: true },
  department: { type: String, default: '' },
  status: { type: String, enum: ['Submitted', 'Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed'], default: 'Submitted' },
  resolution: { type: String, default: '' },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile' }],
  adminNotes: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
