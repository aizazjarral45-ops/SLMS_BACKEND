const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
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
    { id: admin._id.toString(), email: admin.email, role: admin.role },
    secret,
    { expiresIn: process.env.ADMIN_TOKEN_EXPIRES || '1d' },
  );

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

module.exports = { login };
