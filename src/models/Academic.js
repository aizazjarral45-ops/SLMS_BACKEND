const mongoose = require('mongoose');

const academicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profile: {
    program: { type: String, default: '' },
    semester: { type: String, default: '' },
    cgpa: { type: Number, default: 0 },
    department: { type: String, default: '' },
    batch: { type: String, default: '' },
  },
  courses: [{
    code: { type: String, default: '' },
    title: { type: String, default: '' },
    instructor: { type: String, default: '' },
    credits: { type: Number, default: 3 },
  }],
  assignments: [{
    title: { type: String, default: '' },
    course: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    priority: { type: String, default: 'Medium' },
    status: { type: String, default: 'To do' },
  }],
  exams: [{
    title: { type: String, default: '' },
    course: { type: String, default: '' },
    examDate: { type: String, default: '' },
    venue: { type: String, default: '' },
  }],
  attendance: [{
    course: { type: String, default: '' },
    attended: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  }],
  results: [{
    course: { type: String, default: '' },
    marks: { type: Number, default: 0 },
    grade: { type: String, default: '' },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Academic', academicSchema);
