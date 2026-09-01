const StatusHistory = require('../models/StatusHistory');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listStatusHistory = asyncHandler(async (req, res) => {
  const history = await StatusHistory.find({
    entityType: req.query.entityType,
    entityId: req.query.entityId,
  }).sort({ createdAt: -1 });
  return successResponse(res, 'Status history', { history }, 200);
});

module.exports = { listStatusHistory };
