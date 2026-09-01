const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  notifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  aiSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  reminders: { type: [mongoose.Schema.Types.Mixed], default: [] },
  monthlyBudget: { type: Number, default: 0 },
  budgetHistory: { type: [Number], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Preference', preferenceSchema);
