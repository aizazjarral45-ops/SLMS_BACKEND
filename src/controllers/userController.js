const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash');
  const profile = await StudentProfile.findOne({ userId: req.user._id });
  return successResponse(res, 'User profile', { user, profile }, 200);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, program, semester, batch } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return errorResponse(res, 'User not found', null, 404);

  if (name !== undefined) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone).trim();

  if (program !== undefined || semester !== undefined || batch !== undefined) {
    user.profile = {
      ...user.profile,
      ...(program !== undefined ? { program } : {}),
      ...(semester !== undefined ? { semester } : {}),
      ...(batch !== undefined ? { batch } : {}),
    };
  }

  await user.save();

  await StudentProfile.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        ...(name !== undefined ? { fullName: user.name } : {}),
        ...(phone !== undefined ? { phone: user.phone } : {}),
        ...(program !== undefined ? { program } : {}),
        ...(semester !== undefined ? { semester } : {}),
        ...(batch !== undefined ? { batch } : {}),
      },
      $setOnInsert: { userId: user._id },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const safeUser = user.toObject();
  delete safeUser.passwordHash;
  return successResponse(res, 'Profile updated', { user: safeUser }, 200);
});

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const search = req.query.search || '';
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  const total = await User.countDocuments(filter);

  return successResponse(res, 'Users list', { users, total, page, limit }, 200);
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user._id.toString()) {
    return errorResponse(res, 'You cannot delete your own account here', null, 400);
  }

  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return errorResponse(res, 'User not found', null, 404);
  return successResponse(res, 'User deleted', null, 200);
});

const getNotifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, 'Notifications', { notifications: items }, 200);
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true }, { new: true });
  if (!item) return errorResponse(res, 'Notification not found', null, 404);
  return successResponse(res, 'Notification marked as read', { notification: item }, 200);
});

module.exports = { getProfile, updateProfile, listUsers, deleteUser, getNotifications, markNotificationRead };
