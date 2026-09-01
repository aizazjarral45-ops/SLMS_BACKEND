const Request = require('../models/Request');
const StatusHistory = require('../models/StatusHistory');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { recordStatusChange } = require('../services/statusService');
const { createNotification } = require('../services/notificationService');

const listRequests = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'student' ? { userId: req.user._id } : {};
  const requests = await Request.find(filter).sort({ createdAt: -1 });
  return successResponse(res, 'Requests', { requests }, 200);
});

const createRequest = asyncHandler(async (req, res) => {
  const newRequest = await Request.create({
    userId: req.user._id,
    title: req.body.title,
    category: req.body.category,
    type: req.body.type,
    description: req.body.description,
    status: 'Submitted',
    priority: req.body.priority || 'Medium',
    requestedBy: req.user.name,
  });

  await createNotification({
    userId: req.user._id,
    title: 'Request submitted',
    message: `Your request "${newRequest.title}" has been submitted.`,
    type: 'request',
    module: 'requests',
    notifyAdmins: true,
  });

  return successResponse(res, 'Request created', { request: newRequest }, 201);
});

const updateRequestStatus = asyncHandler(async (req, res) => {
  const item = await Request.findById(req.params.id);
  if (!item) return errorResponse(res, 'Request not found', null, 404);

  const previousStatus = item.status;
  item.status = req.body.status || item.status;
  item.adminNotes = item.adminNotes || [];
  if (req.body.comment) item.adminNotes.push(req.body.comment);
  await item.save();

  await recordStatusChange({
    entityType: 'Request',
    entityId: item._id,
    previousStatus,
    newStatus: item.status,
    changedBy: req.user._id,
    changedByRole: req.user.role,
    reason: req.body.reason || 'Request updated',
    comment: req.body.comment || '',
  });

  await createNotification({
    userId: item.userId,
    title: 'Request updated',
    message: `Your request was updated to ${item.status}.`,
    type: 'request',
    module: 'requests',
  });

  return successResponse(res, 'Request updated', { request: item }, 200);
});

const getRequestStatusHistory = asyncHandler(async (req, res) => {
  const history = await StatusHistory.find({ entityType: 'Request', entityId: req.params.id }).sort({ createdAt: -1 });
  return successResponse(res, 'Request status history', { history }, 200);
});

module.exports = { listRequests, createRequest, updateRequestStatus, getRequestStatusHistory };
