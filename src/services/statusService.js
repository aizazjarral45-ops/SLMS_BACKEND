const StatusHistory = require('../models/StatusHistory');

async function recordStatusChange({ entityType, entityId, previousStatus, newStatus, changedBy, changedByRole, reason = '', comment = '' }) {
  return StatusHistory.create({
    entityType,
    entityId,
    previousStatus: previousStatus || '',
    newStatus,
    changedBy,
    changedByRole,
    reason,
    comment,
  });
}

module.exports = { recordStatusChange };
