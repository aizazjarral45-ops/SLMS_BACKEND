const Fee = require('../models/Fee');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isValidObjectId } = require('../utils/objectId');
const HostelApplication = require('../models/HostelApplication');

const listFees = asyncHandler(async (req, res) => {
  const fees = await Fee.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, 'Fees', { fees }, 200);
});

const createFee = asyncHandler(async (req, res) => {
  const applicationId = req.body.hostelApplicationId;
  if (!isValidObjectId(applicationId)) return errorResponse(res, 'A valid hostel application is required', null, 400);
  const application = await HostelApplication.findOne({ _id: applicationId, studentId: req.user._id }).select('_id');
  if (!application) return errorResponse(res, 'Hostel application not found', null, 404);
  const fee = await Fee.create({
    userId: req.user._id,
    hostelApplicationId: application._id,
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
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Fee not found', null, 404);
  const fee = await Fee.findById(req.params.id);
  if (!fee) return errorResponse(res, 'Fee not found', null, 404);
  if (String(fee.userId) !== String(req.user._id)) return errorResponse(res, 'Forbidden', null, 403);

  const fields = ['feeType', 'amount', 'dueDate', 'paidAmount', 'status', 'invoiceNumber', 'paymentMethod'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined && !(req.user.role === 'student' && field === 'status')) fee[field] = field === 'amount' || field === 'paidAmount'
      ? Number(req.body[field])
      : req.body[field];
  });
  await fee.save();
  return successResponse(res, 'Fee updated', { fee }, 200);
});

const deleteFee = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Fee not found', null, 404);
  const fee = await Fee.findOne({ _id: req.params.id, userId: req.user._id }).select('_id hostelApplicationId');
  if (!fee) return errorResponse(res, 'Fee not found', null, 404);
  const application = await HostelApplication.findOne({
    _id: fee.hostelApplicationId,
    studentId: req.user._id,
  }).select('_id');
  if (!application) return errorResponse(res, 'Fee ownership could not be verified', null, 403);
  await Fee.deleteOne({ _id: fee._id, userId: req.user._id });
  return successResponse(res, 'Fee deleted', {}, 200);
});

module.exports = { listFees, createFee, updateFee, deleteFee };
