const mongoose = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const AIConversation = require('../models/AIConversation');
const Academic = require('../models/Academic');
const AdminRecord = require('../models/AdminRecord');
const Application = require('../models/Application');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const Comment = require('../models/Comment');
const Complaint = require('../models/Complaint');
const Course = require('../models/Course');
const EmailVerification = require('../models/EmailVerification');
const Exam = require('../models/Exam');
const Expense = require('../models/Expense');
const Fee = require('../models/Fee');
const Hostel = require('../models/Hostel');
const HostelApplication = require('../models/HostelApplication');
const LoginHistory = require('../models/LoginHistory');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const PasswordResetToken = require('../models/PasswordResetToken');
const Preference = require('../models/Preference');
const Reminder = require('../models/Reminder');
const Request = require('../models/Request');
const Settings = require('../models/Settings');
const StatusHistory = require('../models/StatusHistory');
const StudentProfile = require('../models/StudentProfile');
const UploadedFile = require('../models/UploadedFile');

const userOwnedDeletes = [
  [AIConversation, { userId: 'userId' }],
  [Academic, { userId: 'userId' }],
  [Application, { userId: 'userId' }],
  [Assignment, { userId: 'userId' }],
  [Attendance, { userId: 'userId' }],
  [Comment, { userId: 'userId' }],
  [Complaint, { userId: 'userId' }],
  [Course, { userId: 'userId' }],
  [Exam, { userId: 'userId' }],
  [Expense, { userId: 'userId' }],
  [Fee, { userId: 'userId' }],
  [Hostel, { userId: 'userId' }],
  [HostelApplication, { studentId: 'userId' }],
  [Preference, { userId: 'userId' }],
  [Reminder, { userId: 'userId' }],
  [Request, { userId: 'userId' }],
  [Settings, { userId: 'userId' }],
  [StatusHistory, { changedBy: 'userId' }],
  [StudentProfile, { userId: 'userId' }],
  [UploadedFile, { userId: 'userId' }],
];

function idQuery(field, userId) {
  return { [field]: userId };
}

async function deleteAccountData(userId, email, session) {
  const options = session ? { session } : {};
  for (const [Model, fields] of userOwnedDeletes) {
    const [field] = Object.keys(fields);
    await Model.deleteMany(idQuery(field, userId), options);
  }

  await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }, options);
  await LoginHistory.deleteMany({ $or: [{ userId }, { email }] }, options);
  await Notification.deleteMany({
    $or: [
      { recipientId: userId },
      { userId },
      { senderId: userId },
      { sourceUserId: userId },
    ],
  }, options);
  await AdminRecord.deleteMany({ $or: [{ targetUserId: userId }, { createdBy: userId }] }, options);
  await AuditLog.deleteMany({ $or: [{ userId }, { actorId: userId }] }, options);
  await Session.deleteMany({ userId }, options);
  await PasswordResetToken.deleteMany({ $or: [{ userId }, { email }] }, options);
  await EmailVerification.deleteMany({ email }, options);
  await AccountDeletionRequest.deleteMany({ userId }, options);
  await User.deleteOne({ _id: userId }, options);
}

function transactionUnsupported(error) {
  return error && (
    error.code === 20
    || error.code === 263
    || /transaction numbers are only allowed|does not support transactions|transactions are not supported/i.test(error.message || '')
  );
}

async function permanentlyDeleteAccount(userId, email) {
  const session = await mongoose.startSession();
  try {
    try {
      await session.withTransaction(() => deleteAccountData(userId, email, session));
    } catch (error) {
      if (!transactionUnsupported(error)) throw error;
      await deleteAccountData(userId, email);
    }
  } finally {
    await session.endSession();
  }
}

module.exports = { permanentlyDeleteAccount };
