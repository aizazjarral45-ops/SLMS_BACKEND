const Complaint = require('../models/Complaint');
const StatusHistory = require('../models/StatusHistory');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { recordStatusChange } = require('../services/statusService');
const { createNotification } = require('../services/notificationService');
const { isValidObjectId } = require('../utils/objectId');

const listComplaints = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'student' ? { userId: req.user._id } : {};
  const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
  return successResponse(res, 'Complaints', { complaints }, 200);
});
const createComplaint = asyncHandler(async (req, res) => {
  if (!String(req.body.title || '').trim() || !String(req.body.description || '').trim()) return errorResponse(res, 'Complaint title and description are required', null, 400);
  const complaint = await Complaint.create({ userId: req.user._id, title: String(req.body.title).trim(), category: req.body.category || 'Other', priority: req.body.priority || 'Medium', description: String(req.body.description).trim(), department: `${req.body.category || 'General'} Department`, status: 'Submitted', resolution: 'Complaint logged and assigned for review.', date: new Date().toISOString().slice(0, 10), attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [] });
  await createNotification({ userId: req.user._id, sourceUserId: req.user._id, title: 'Complaint submitted', message: `Your complaint "${complaint.title}" has been received.`, type: 'complaint', module: 'complaints', relatedModel: 'Complaint', relatedId: complaint._id, notifyAdmins: true });
  return successResponse(res, 'Complaint created', { complaint }, 201);
});
const updateComplaintStatus = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Complaint not found', null, 404);
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return errorResponse(res, 'Complaint not found', null, 404);
  const previousStatus = complaint.status;
  if (req.body.status !== undefined) complaint.status = req.body.status;
  if (req.body.resolution !== undefined) complaint.resolution = req.body.resolution;
  if (req.body.comment) complaint.adminNotes.push(req.body.comment);
  await complaint.save();
  await recordStatusChange({ entityType: 'Complaint', entityId: complaint._id, previousStatus, newStatus: complaint.status, changedBy: req.user._id, changedByRole: req.user.role, reason: req.body.reason || 'Status updated', comment: req.body.comment || req.body.resolution || '' });
  if (previousStatus !== complaint.status) {
    await createNotification({
      userId: complaint.userId,
      sourceUserId: req.user._id,
      title: `Complaint ${complaint.status}`,
      message: `Your complaint status changed from ${previousStatus} to ${complaint.status}.`,
      type: 'complaint',
      module: 'complaints',
      relatedModel: 'Complaint',
      relatedId: complaint._id,
      navigationTarget: '/complaints',
      dedupeKey: `complaint:${complaint._id}:${complaint.status}`,
    });
  }
  return successResponse(res, 'Complaint status updated', { complaint }, 200);
});
const getComplaintStatusHistory = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Complaint not found', null, 404);
  const complaint = await Complaint.findById(req.params.id).select('userId');
  if (!complaint) return errorResponse(res, 'Complaint not found', null, 404);
  if (req.user.role === 'student' && String(complaint.userId) !== String(req.user._id)) return errorResponse(res, 'Forbidden', null, 403);
  const history = await StatusHistory.find({ entityType: 'Complaint', entityId: req.params.id }).sort({ createdAt: -1 });
  return successResponse(res, 'Complaint status history', { history }, 200);
});
module.exports = { listComplaints, createComplaint, updateComplaintStatus, getComplaintStatusHistory };
