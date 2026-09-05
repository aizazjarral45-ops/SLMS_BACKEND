const mongoose = require('mongoose');

const notificationFields = {
  assignment: { type: Boolean, default: true },
  quiz: { type: Boolean, default: true },
  exam: { type: Boolean, default: true },
  attendance: { type: Boolean, default: false },
  expense: { type: Boolean, default: true },
  complaints: { type: Boolean, default: true },
  hostel: { type: Boolean, default: true },
  reminder: { type: Boolean, default: true },
  ai: { type: Boolean, default: false },
};

const aiFields = {
  studyPlanner: { type: Boolean, default: true },
  budgetWarnings: { type: Boolean, default: true },
  complaintDrafting: { type: Boolean, default: false },
};

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  notifications: { type: new mongoose.Schema(notificationFields, { _id: false }), default: () => ({}) },
  ai: { type: new mongoose.Schema(aiFields, { _id: false }), default: () => ({}) },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
