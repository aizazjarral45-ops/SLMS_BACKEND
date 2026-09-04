const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostelApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelApplication', default: null, index: true },
  feeType: { type: String, default: 'Tuition' },
  amount: { type: Number, default: 0 },
  dueDate: { type: String, default: '' },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Overdue'], default: 'Pending' },
  invoiceNumber: { type: String, default: '' },
  paymentMethod: { type: String, default: 'Cash' },
}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
