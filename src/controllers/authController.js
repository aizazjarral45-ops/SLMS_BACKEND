const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const LoginHistory = require('../models/LoginHistory');
const StudentProfile = require('../models/StudentProfile');
const PasswordResetToken = require('../models/PasswordResetToken');
const { signToken, hashToken } = require('../services/authService');
const { sendPasswordResetOtp } = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  };
}

function issueTokens(user, sessionId) {
  const payload = { id: user._id, email: user.email, role: user.role, sessionId, tokenVersion: user.tokenVersion || 0 };
  const accessToken = signToken(payload, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_EXPIRES || '15m');
  const refreshToken = signToken(payload, process.env.JWT_REFRESH_SECRET, process.env.REFRESH_TOKEN_EXPIRES || '7d');
  return { accessToken, refreshToken };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const role = 'student';
  if (!name || !email || !password) {
    return errorResponse(res, 'Name, email and password are required', null, 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return errorResponse(res, 'User already exists', null, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    permissions: role === 'admin' ? ['manage_students', 'manage_academics', 'manage_hostel', 'approve_finance', 'resolve_complaints'] : ['view_dashboard', 'submit_requests', 'submit_complaints'],
  });

  const sessionId = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await Session.create({
    userId: user._id,
    sessionId,
    browser: 'unknown',
    deviceInfo: 'web',
    ipAddress: getRequestMeta(req).ipAddress,
    status: 'active',
    expiresAt,
  });

  await StudentProfile.create({
    userId: user._id,
    fullName: name,
    universityEmail: email,
    program: 'General',
  });

  const tokens = issueTokens(user, sessionId);
  await LoginHistory.create({
    userId: user._id,
    email: user.email,
    status: 'account_created',
    sessionId,
    ...getRequestMeta(req),
  });

  const safeUser = user.toObject();
  delete safeUser.passwordHash;

  return successResponse(res, 'Registration successful', {
    user: safeUser,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    sessionId,
  }, 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return errorResponse(res, 'Email and password are required', null, 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    await LoginHistory.create({ email: email.toLowerCase(), status: 'failed', ...getRequestMeta(req) });
    return errorResponse(res, 'Incorrect email or password', null, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await LoginHistory.create({ userId: user._id, email: user.email, status: 'failed', ...getRequestMeta(req) });
    return errorResponse(res, 'Incorrect email or password', null, 401);
  }
  if (user.status !== 'Active') {
    return errorResponse(res, 'This account is not active', null, 403);
  }

  const activeSession = await Session.findOne({ userId: user._id, status: 'active', expiresAt: { $gt: new Date() } });
  if (activeSession && process.env.SESSION_POLICY === 'single_active_session') {
    activeSession.status = 'logged_out';
    activeSession.logoutAt = new Date();
    await activeSession.save();
  }

  const sessionId = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * (rememberMe ? 7 : 1));

  const session = await Session.create({
    userId: user._id,
    sessionId,
    status: 'active',
    expiresAt,
    browser: 'unknown',
    deviceInfo: rememberMe ? 'remembered' : 'session',
    ipAddress: getRequestMeta(req).ipAddress,
  });

  user.lastLoginAt = new Date();
  user.lastSeenAt = new Date();
  await user.save();

  const tokens = issueTokens(user, sessionId);
  await LoginHistory.create({ userId: user._id, email: user.email, status: 'success', sessionId, ...getRequestMeta(req) });

  const safeUser = user.toObject();
  delete safeUser.passwordHash;

  return successResponse(res, 'Login successful', {
    user: safeUser,
    sessionId: session.sessionId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  }, 200);
});

const logout = asyncHandler(async (req, res) => {
  const sessionId = req.session?.sessionId || null;
  if (sessionId) {
    await Session.findOneAndUpdate({ sessionId,}, { status: 'logged_out', logoutAt: new Date() });
  }

  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  await LoginHistory.create({ userId: req.user._id, status: 'logout', sessionId, ...getRequestMeta(req) });
  return successResponse(res, 'Logout successful', null, 200);
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return errorResponse(res, 'Refresh token is required', null, 400);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return errorResponse(res, 'Invalid refresh token', null, 401);
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return errorResponse(res, 'Refresh token is no longer valid', null, 401);
    }

    const session = await Session.findOne({ userId: user._id, sessionId: decoded.sessionId, status: 'active', expiresAt: { $gt: new Date() } });
    if (!session) return errorResponse(res, 'Session not found', null, 401);

    const tokens = issueTokens(user, decoded.sessionId);
    return successResponse(res, 'Token refreshed', { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 200);
  } catch (error) {
    return errorResponse(res, 'Invalid or expired refresh token', error.message, 401);
  }
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash');
  return successResponse(res, 'Current user', { user }, 200);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return errorResponse(res, 'Current password is incorrect', null, 400);

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  await LoginHistory.create({ userId: user._id, email: user.email, status: 'success', sessionId: req.session?.sessionId || '', ...getRequestMeta(req) });
  return successResponse(res, 'Password updated successfully', null, 200);
});

const createResetToken = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return errorResponse(res, 'Email is required', null, 400);
  const user = await User.findOne({ email });
  if (!user) return errorResponse(res, 'Account not found', null, 404);

  const otp = String(crypto.randomInt(100000, 1000000));
  await PasswordResetToken.deleteMany({ email });
  await PasswordResetToken.create({
    userId: user._id,
    email,
    otpHash: crypto.createHash('sha256').update(otp).digest('hex'),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  await sendPasswordResetOtp(email, otp);
  return successResponse(res, 'Password reset code sent', { email }, 200);
});

const verifyResetToken = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const reset = await PasswordResetToken.findOne({ email }).sort({ createdAt: -1 });
  if (!reset || reset.expiresAt <= new Date()) return errorResponse(res, 'Code is invalid or expired', null, 400);
  if (reset.attempts >= 5) return errorResponse(res, 'Too many verification attempts', null, 429);
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  if (hash !== reset.otpHash) {
    reset.attempts += 1;
    await reset.save();
    return errorResponse(res, 'Code is invalid or expired', null, 400);
  }
  reset.verifiedAt = new Date();
  await reset.save();
  return successResponse(res, 'Code verified', null, 200);
});

const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const password = String(req.body.password || '');
  if (!email || !code || password.length < 8) {
    return errorResponse(res, 'Email, code and a password of at least 8 characters are required', null, 400);
  }
  const reset = await PasswordResetToken.findOne({ email }).sort({ createdAt: -1 });
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  if (!reset || reset.expiresAt <= new Date() || !reset.verifiedAt || hash !== reset.otpHash) {
    return errorResponse(res, 'Code must be verified before resetting the password', null, 400);
  }
  const user = await User.findById(reset.userId);
  if (!user) return errorResponse(res, 'User not found', null, 404);
  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();
  await PasswordResetToken.deleteMany({ email });
  return successResponse(res, 'Password reset successful', null, 200);
});

const forgotPassword = createResetToken;

const getLoginHistory = asyncHandler(async (req, res) => {
  const history = await LoginHistory.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(25);
  return successResponse(res, 'Login history', { history }, 200);
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getLoginHistory,
};
