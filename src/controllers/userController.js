const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Notification = require('../models/Notification');
const Academic = require('../models/Academic');
const AcademicProfile = require('../models/AcademicProfile');
const Application = require('../models/Application');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const AIConversation = require('../models/AIConversation');
const Comment = require('../models/Comment');
const Complaint = require('../models/Complaint');
const Course = require('../models/Course');
const Expense = require('../models/Expense');
const Exam = require('../models/Exam');
const Fee = require('../models/Fee');
const Hostel = require('../models/Hostel');
const HostelApplication = require('../models/HostelApplication');
const LoginHistory = require('../models/LoginHistory');
const Message = require('../models/Message');
const PasswordResetToken = require('../models/PasswordResetToken');
const Preference = require('../models/Preference');
const Settings = require('../models/Settings');
const Reminder = require('../models/Reminder');
const Request = require('../models/Request');
const Session = require('../models/Session');
const StatusHistory = require('../models/StatusHistory');
const UploadedFile = require('../models/UploadedFile');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isValidObjectId } = require('../utils/objectId');

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
      $unset: { CGP: 1 },
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
  if (!isValidObjectId(id)) return errorResponse(res, 'User not found', null, 404);
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

module.exports = {
  getProfile,
  updateProfile,
  listUsers,
  deleteUser,
  getNotifications,
  markNotificationRead,
};
