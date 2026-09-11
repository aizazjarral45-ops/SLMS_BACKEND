const Settings = require('../models/Settings');
const { errorResponse, successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const notificationKeys = new Set(['assignment', 'quiz', 'exam', 'attendance', 'expense', 'complaints', 'hostel', 'reminder', 'ai']);
const aiKeys = new Set(['studyPlanner', 'budgetWarnings', 'complaintDrafting']);
const securityBooleanKeys = new Set(['mfaEnabled', 'loginAlerts', 'auditLogging', 'suspiciousActivityBlocking']);
const securityNumberKeys = new Set(['sessionTimeoutMinutes', 'passwordRotationDays']);
const securityStringKeys = new Set(['passwordPolicy']);

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

const toAdminResponse = (settings) => ({
  ...toResponse(settings),
  theme: settings.theme || 'Light',
  security: settings.security || {},
  preferences: settings.preferences || {},
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

const validateSecurity = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'security must be an object';
  for (const [key, setting] of Object.entries(value)) {
    if (securityBooleanKeys.has(key) && typeof setting !== 'boolean') return `security.${key} must be a boolean`;
    if (securityNumberKeys.has(key) && (!Number.isInteger(setting) || setting < 1)) return `security.${key} must be a positive integer`;
    if (securityStringKeys.has(key) && typeof setting !== 'string') return `security.${key} must be a string`;
    if (!securityBooleanKeys.has(key) && !securityNumberKeys.has(key) && !securityStringKeys.has(key)) return `Unknown security field: ${key}`;
  }
  return null;
};

const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne({ userId: req.userId }).lean();
  return successResponse(res, 'Admin settings', {
    settings: settings ? toAdminResponse(settings) : { notifications: {}, aiSettings: {}, theme: 'Light', security: {}, preferences: {} },
    account: { id: String(req.user._id), email: req.user.email, role: req.user.role },
  }, 200);
});

const updateAdminSecurity = asyncHandler(async (req, res) => {
  const error = validateSecurity(req.body);
  if (error) return errorResponse(res, error, null, 400);
  const settings = await Settings.findOneAndUpdate(
    { userId: req.userId },
    { $set: { security: req.body }, $setOnInsert: { userId: req.userId } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  return successResponse(res, 'Security settings updated', { settings: toAdminResponse(settings) }, 200);
});

module.exports = { getSettings, updateNotifications, updateAiSettings, getAdminSettings, updateAdminSecurity };
