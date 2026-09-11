const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const LoginHistory = require('../models/LoginHistory');
const asyncHandler = require('../utils/asyncHandler');
const { errorResponse } = require('../utils/apiResponse');

const INVALID_CREDENTIALS_MESSAGE = 'Incorrect email or password';

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return errorResponse(res, 'Email and password are required', null, 400);
  }

  const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!configuredEmail) {
    return errorResponse(res, 'Admin authentication is not configured', null, 500);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== configuredEmail) {
    return res.status(401).json({
      success: false,
      message: INVALID_CREDENTIALS_MESSAGE,
    });
  }

  const admin = await Admin.findOne({ email: configuredEmail }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: INVALID_CREDENTIALS_MESSAGE,
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return errorResponse(res, 'Admin authentication is not configured', null, 500);
  }

  const token = jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: admin.role, tokenVersion: admin.tokenVersion || 0 },
    secret,
    { expiresIn: process.env.ADMIN_TOKEN_EXPIRES || '1d' },
  );

  await LoginHistory.create({
    email: admin.email,
    eventType: 'LOGIN_SUCCESS',
    status: 'LOGIN_SUCCESS',
    ipAddress: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    metadata: { role: 'admin' },
  });

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    admin: {
      email: admin.email,
      role: admin.role,
    },
  });

});

const logout = asyncHandler(async (req, res) => {
  await Admin.updateOne({ _id: req.adminId }, { $inc: { tokenVersion: 1 } });
  await LoginHistory.create({
    email: req.admin.email,
    eventType: 'LOGOUT',
    status: 'LOGOUT',
    ipAddress: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    metadata: { role: 'admin' },
  });
  return res.status(200).json({ success: true, message: 'Logout successful' });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    return errorResponse(res, 'Current password and a new password of at least 8 characters are required', null, 400);
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return errorResponse(res, 'New password must include uppercase, lowercase, and numeric characters', null, 400);
  }
  const admin = await Admin.findById(req.adminId).select('+password');
  if (!admin) return errorResponse(res, 'Admin account not found', null, 404);
  if (!(await bcrypt.compare(currentPassword, admin.password))) {
    return errorResponse(res, 'Current password is incorrect', null, 400);
  }
  admin.password = newPassword;
  await admin.save();
  return res.status(200).json({ success: true, message: 'Password updated successfully' });
});

const getLoginHistory = asyncHandler(async (req, res) => {
  const history = await LoginHistory.find({ email: req.admin.email })
    .sort({ createdAt: -1, _id: -1 })
    .limit(50)
    .select('email eventType status ipAddress userAgent createdAt');
  return res.status(200).json({ success: true, message: 'Login history', data: { history } });
});

module.exports = { login, logout, changePassword, getLoginHistory };
