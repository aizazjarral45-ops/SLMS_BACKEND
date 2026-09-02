const Fee = require('../models/Fee');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listFees = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'student' ? { userId: req.user._id } : {};
  const fees = await Fee.find(filter).sort({ createdAt: -1 });
  return successResponse(res, 'Fees', { fees }, 200);
});

const createFee = asyncHandler(async (req, res) => {
  const fee = await Fee.create({
    userId: req.user._id,
    feeType: req.body.feeType || 'Tuition',
    amount: req.body.amount || 0,
    dueDate: req.body.dueDate || '',
    paidAmount: req.body.paidAmount || 0,
    status: req.body.status || 'Pending',
    invoiceNumber: req.body.invoiceNumber || '',
    paymentMethod: req.body.paymentMethod || 'Cash',
  });
  return successResponse(res, 'Fee created', { fee }, 201);
});

const updateFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return errorResponse(res, 'Fee not found', null, 404);
  if (req.user.role === 'student' && String(fee.userId) !== String(req.user._id)) return errorResponse(res, 'Forbidden', null, 403);

  const fields = ['feeType', 'amount', 'dueDate', 'paidAmount', 'status', 'invoiceNumber', 'paymentMethod'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) fee[field] = field === 'amount' || field === 'paidAmount'
      ? Number(req.body[field])
      : req.body[field];
  });
  await fee.save();
  return successResponse(res, 'Fee updated', { fee }, 200);
});

module.exports = { listFees, createFee, updateFee };
