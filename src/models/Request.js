const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'general' },
  type: { type: String, default: 'general' },
  description: { type: String, required: true },
  status: { type: String, enum: ['Submitted', 'Pending', 'In Progress', 'Approved', 'Rejected', 'Completed', 'Cancelled'], default: 'Submitted' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  requestedBy: { type: String, default: '' },
  adminNotes: [{ type: String }],
  dueDate: { type: Date, default: null },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile' }],
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
