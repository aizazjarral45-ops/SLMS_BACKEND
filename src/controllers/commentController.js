const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Request = require('../models/Request');
const Assignment = require('../models/Assignment');
const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');
const Fee = require('../models/Fee');
const Application = require('../models/Application');
const HostelApplication = require('../models/HostelApplication');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const targetModels = {
  complaint: Complaint,
  request: Request,
  assignment: Assignment,
  expense: Expense,
  hostel: Hostel,
  'hostel-application': HostelApplication,
  hostelapplication: HostelApplication,
  fee: Fee,
  application: Application,
};
async function authorizeTarget(req, type, id) {
  if (!mongoose.isValidObjectId(id)) return false;
  const Model = targetModels[String(type).toLowerCase()];
  if (!Model) return false;
  const target = await Model.findById(id).select('userId studentId').lean();
  if (!target) return false;
  if (['admin', 'super_admin'].includes(req.user.role)) return true;
  return String(target.userId || target.studentId) === String(req.user._id);
}

const listComments = asyncHandler(async (req, res) => {
  if (!(await authorizeTarget(req, req.params.type, req.params.id))) return errorResponse(res, 'Target not found', null, 404);
  const comments = await Comment.find({ targetType: req.params.type, targetId: req.params.id }).sort({ createdAt: -1 });
  return successResponse(res, 'Comments', { comments }, 200);
});

const addComment = asyncHandler(async (req, res) => {
  if (!(await authorizeTarget(req, req.params.type, req.params.id))) return errorResponse(res, 'Target not found', null, 404);
  if (!String(req.body.text || '').trim()) return errorResponse(res, 'Comment text is required', null, 400);
  const comment = await Comment.create({
    targetType: req.params.type,
    targetId: req.params.id,
    userId: req.user._id,
    text: String(req.body.text).trim(),
  });
  return successResponse(res, 'Comment added', { comment }, 201);
});

const deleteComment = asyncHandler(async (req, res) => {
  const deleted = await Comment.findOneAndDelete({
    _id: req.params.commentId,
    targetType: req.params.type,
    targetId: req.params.id,
    userId: req.user._id,
  });
  if (!deleted) return errorResponse(res, 'Comment not found', null, 404);
  return successResponse(res, 'Comment deleted', {}, 200);
});

module.exports = { listComments, addComment, deleteComment };
