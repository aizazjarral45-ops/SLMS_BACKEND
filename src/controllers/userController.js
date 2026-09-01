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

  if (name) user.name = name;
  if (phone) user.phone = phone;

  if (program || semester || batch) {
    user.profile = { ...user.profile, program: program || user.profile.program, semester: semester || user.profile.semester, batch: batch || user.profile.batch };
  }

  await user.save();

  await StudentProfile.findOneAndUpdate(
    { userId: user._id },
    { $set: { fullName: name || user.name, phone: phone || '', program: program || '', semester: semester || '', batch: batch || '' } },
    { upsert: true, new: true },
  );

  const safeUser = user.toObject();
  delete safeUser.passwordHash;
  return successResponse(res, 'Profile updated', { user: safeUser }, 200);
});

const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
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

  await User.findByIdAndDelete(id);
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
