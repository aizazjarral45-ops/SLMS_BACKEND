const StudentProfile = require('../models/StudentProfile');
const Complaint = require('../models/Complaint');
const Request = require('../models/Request');
const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getDashboard = asyncHandler(async (_req, res) => {
  const [students, complaints, requests, expenses, hostels, notifications, roles, permissions] = await Promise.all([
    StudentProfile.countDocuments(),
    Complaint.countDocuments(),
    Request.countDocuments(),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Hostel.countDocuments(),
    Notification.countDocuments(),
    Role.find({}),
    Permission.find({}),
  ]);

  return successResponse(res, 'Admin dashboard data', {
    stats: {
      students,
      complaints,
      requests,
      totalExpense: expenses[0]?.total || 0,
      hostels,
      notifications,
    },
    roles,
    permissions,
  }, 200);
});

const listRoles = asyncHandler(async (_req, res) => {
  const roles = await Role.find({});
  return successResponse(res, 'Roles', { roles }, 200);
});

const listPermissions = asyncHandler(async (_req, res) => {
  const permissions = await Permission.find({});
  return successResponse(res, 'Permissions', { permissions }, 200);
});

const getAuditLogs = asyncHandler(async (_req, res) => {
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(50);
  return successResponse(res, 'Audit logs', { logs }, 200);
});

module.exports = { getDashboard, listRoles, listPermissions, getAuditLogs };
