const Session = require('../models/Session');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, 'Sessions', { sessions }, 200);
});

const revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { status: 'logged_out', logoutAt: new Date() },
    { new: true },
  );
  return successResponse(res, 'Session revoked', { session }, 200);
});

module.exports = { listSessions, revokeSession };
