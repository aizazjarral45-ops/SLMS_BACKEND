const bcrypt = require('bcryptjs');
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

const deleteOwnAccount = asyncHandler(async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) return errorResponse(res, 'Password is required', null, 400);

  const user = await User.findById(req.user._id);
  if (!user) return errorResponse(res, 'User not found', null, 404);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return errorResponse(res, 'Incorrect Password', null, 401);

  const userId = user._id;
  const userEmail = user.email;
  const deletionOperations = [
    [StudentProfile, { userId }],
    [Academic, { userId }],
    [AcademicProfile, { userId }],
    [Application, { userId }],
    [Assignment, { userId }],
    [Attendance, { userId }],
    [AIConversation, { userId }],
    [Comment, { userId }],
    [Complaint, { userId }],
    [Course, { userId }],
    [Expense, { userId }],
    [Exam, { userId }],
    [Fee, { userId }],
    [Hostel, { userId }],
    [HostelApplication, { studentId: userId }],
    [LoginHistory, { $or: [{ userId }, { email: userEmail }] }],
    [Message, { $or: [{ senderId: userId }, { receiverId: userId }] }],
    [PasswordResetToken, { userId }],
    [Preference, { userId }],
    [Reminder, { userId }],
    [Request, { userId }],
    [Session, { userId }],
    [StatusHistory, { changedBy: userId }],
    [UploadedFile, { userId }],
    [Notification, { $or: [{ recipientId: userId }, { recipientId: null, userId }] }],
  ];

  for (const [Model, filter] of deletionOperations) {
    await Model.deleteMany(filter);
  }

  const deletedUser = await User.deleteOne({ _id: userId });
  if (deletedUser.deletedCount !== 1) {
    return errorResponse(res, 'Account deletion failed', null, 500);
  }

  return successResponse(res, 'Account deleted permanently', null, 200);
});

module.exports = {
  getProfile,
  updateProfile,
  listUsers,
  deleteUser,
  deleteOwnAccount,
  getNotifications,
  markNotificationRead,
};
