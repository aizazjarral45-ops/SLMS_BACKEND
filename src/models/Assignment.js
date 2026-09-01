const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  course: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['To do', 'In progress', 'Completed', 'Overdue'], default: 'To do' },
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
