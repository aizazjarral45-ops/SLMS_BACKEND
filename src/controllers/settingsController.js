const Settings = require('../models/Settings');
const { errorResponse, successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const notificationKeys = new Set(['assignment', 'quiz', 'exam', 'attendance', 'expense', 'complaints', 'hostel', 'reminder', 'ai']);
const aiKeys = new Set(['studyPlanner', 'budgetWarnings', 'complaintDrafting']);

function validatePatch(value, allowedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `${label} must be an object`;
  for (const [key, setting] of Object.entries(value)) {
    if (!allowedKeys.has(key)) return `Unknown ${label} field: ${key}`;
    if (typeof setting !== 'boolean') return `${label}.${key} must be a boolean`;
  }
  return null;
}

const toResponse = (settings) => ({
  notifications: settings.notifications,
  aiSettings: settings.ai,
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne({ userId: req.userId }).lean();
  return successResponse(res, 'Settings', {
    settings: settings ? toResponse(settings) : { notifications: {}, aiSettings: {} },
  }, 200);
});

const updateNotifications = asyncHandler(async (req, res) => {
  const error = validatePatch(req.body, notificationKeys, 'notifications');
  if (error) return errorResponse(res, error, null, 400);
  const settings = await Settings.findOneAndUpdate(
    { userId: req.userId },
    { $set: Object.fromEntries(Object.entries(req.body).map(([key, value]) => [`notifications.${key}`, value])), $setOnInsert: { userId: req.userId } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  return successResponse(res, 'Notification settings updated', { settings: toResponse(settings) }, 200);
});

const updateAiSettings = asyncHandler(async (req, res) => {
  const error = validatePatch(req.body, aiKeys, 'aiSettings');
  if (error) return errorResponse(res, error, null, 400);
  const settings = await Settings.findOneAndUpdate(
    { userId: req.userId },
    { $set: Object.fromEntries(Object.entries(req.body).map(([key, value]) => [`ai.${key}`, value])), $setOnInsert: { userId: req.userId } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  return successResponse(res, 'AI settings updated', { settings: toResponse(settings) }, 200);
});

module.exports = { getSettings, updateNotifications, updateAiSettings };
