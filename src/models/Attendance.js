const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: String, required: true, trim: true, maxlength: 150 },
  attended: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { timestamps: true, strict: true });

attendanceSchema.path('attended').validate(function (value) {
  const total = this.total === undefined && typeof this.get === 'function' ? this.get('total') : this.total;
  return total === undefined || value <= total;
}, 'Attended classes cannot exceed total classes');

module.exports = mongoose.model('Attendance', attendanceSchema);
