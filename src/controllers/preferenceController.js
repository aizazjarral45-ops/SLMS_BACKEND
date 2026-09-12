const Preference = require('../models/Preference');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification, ensureBudgetNotifications } = require('../services/notificationService');
const { emitDataChange } = require('../config/socket');

const getPreferences = asyncHandler(async (req, res) => {
  const preferences = await Preference.findOne({ userId: req.user._id }).lean();
  return successResponse(res, 'Preferences', { preferences: preferences || {} }, 200);
});

const updatePreferences = asyncHandler(async (req, res) => {
  const allowed = ['notifications', 'aiSettings', 'reminders', 'monthlyBudget', 'budgetHistory'];
  const update = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  });
  const preferences = await Preference.findOneAndUpdate(
    { userId: req.user._id },
    { $set: update, $setOnInsert: { userId: req.user._id } },
    { new: true, upsert: true, runValidators: true },
  );
  if (req.body.monthlyBudget !== undefined) {
    await createNotification({
      userId: req.user._id,
      sourceUserId: req.user._id,
      title: 'Budget updated',
      message: 'Your budget was updated.',
      type: 'expense',
      module: 'expenses',
      navigationTarget: '/expense',
      relatedModel: 'Preference',
      relatedId: preferences._id,
      dedupeKey: `budget:update:${preferences._id}:${preferences.updatedAt.getTime()}`,
    });
    await ensureBudgetNotifications(req.userId, preferences);
  }
  emitDataChange({ userId: req.user._id, resource: 'preferences', action: 'updated', record: preferences });
  return successResponse(res, 'Preferences updated', { preferences }, 200);
});

module.exports = { getPreferences, updatePreferences };
