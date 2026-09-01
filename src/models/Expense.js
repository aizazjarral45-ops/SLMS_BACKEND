const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'Miscellaneous' },
  amount: { type: Number, default: 0 },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  paymentMethod: { type: String, default: 'Cash' },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  status: { type: String, enum: ['Logged', 'Pending', 'Approved', 'Rejected', 'Paid'], default: 'Logged' },
  receipt: { type: String, default: 'N/A' },
  receiptUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
