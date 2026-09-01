const Preference = require('../models/Preference');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

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
  return successResponse(res, 'Preferences updated', { preferences }, 200);
});

module.exports = { getPreferences, updatePreferences };
