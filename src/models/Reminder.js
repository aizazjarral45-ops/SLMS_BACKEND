const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  when: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false },
}, { timestamps: true });

reminderSchema.index({ userId: 1, when: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
