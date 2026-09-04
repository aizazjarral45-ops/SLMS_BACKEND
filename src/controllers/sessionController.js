const Session = require('../models/Session');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, 'Sessions', { sessions }, 200);
});

const revokeSession = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return errorResponse(res, 'Session not found', null, 404);
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { status: 'logged_out', logoutAt: new Date() },
    { new: true },
  );
  if (!session) return errorResponse(res, 'Session not found', null, 404);
  return successResponse(res, 'Session revoked', { session }, 200);
});

module.exports = { listSessions, revokeSession };
