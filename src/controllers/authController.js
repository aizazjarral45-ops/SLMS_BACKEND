const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const LoginHistory = require('../models/LoginHistory');
const StudentProfile = require('../models/StudentProfile');
const PasswordResetToken = require('../models/PasswordResetToken');
const EmailVerification = require('../models/EmailVerification');
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const { createNotification } = require('../services/notificationService');
const { signToken } = require('../services/authService');
const { sendPasswordResetOtp, sendSignupVerificationOtp, sendAccountDeletionOtp } = require('../services/emailService');
const { permanentlyDeleteAccount } = require('../services/accountDeletionService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const MAX_LOGIN_ATTEMPTS = Math.max(1, Number.parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS, 10) || 5);
const LOCKOUT_MINUTES = Math.max(1, Number.parseInt(process.env.AUTH_LOCKOUT_MINUTES, 10) || 15);
const DELETION_OTP_TTL_MS = 10 * 60 * 1000;
const DELETION_RESEND_INTERVAL_MS = 60 * 1000;
const DELETION_SEND_WINDOW_MS = 60 * 60 * 1000;
const DELETION_MAX_SENDS_PER_WINDOW = 3;
const DELETION_MAX_ATTEMPTS = 5;

function getRequestMeta(req) {
  const forwarded = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  const ipAddress = req.ip || (Array.isArray(forwarded) ? forwarded[0] : forwarded) || '';

  return {
    ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : '',
    userAgent: req.headers && req.headers['user-agent'] ? req.headers['user-agent'] : '',
  };
}

async function logAuthEvent({ req, userId, email, eventType, status, sessionId, metadata = {} }) {
  try {
    const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const sanitizedMetadata = Object.fromEntries(
      Object.entries(safeMetadata).filter(([key, value]) => (
        !/(password|passwd|secret|token|otp|code|hash)/i.test(key)
        && value !== undefined
        && value !== null
        && ['string', 'number', 'boolean'].includes(typeof value)
      )),
    );
    await LoginHistory.create({
      userId: userId || undefined,
      email: email ? String(email).trim().toLowerCase() : undefined,
      eventType,
      status: status || eventType,
      sessionId: sessionId || '',
      ...getRequestMeta(req),
      metadata: sanitizedMetadata,
    });
  } catch (error) {
    console.warn('Auth history logging failed:', error.message || error);
  }
}

async function createLoginNotification(userId, req) {
  try {
    await createNotification({
      userId,
      sourceUserId: userId,
      title: 'Login successful',
      message: `A successful login was detected from ${getRequestMeta(req).ipAddress || 'your device'}.`,
      type: 'security',
      module: 'auth',
      relatedModel: 'User',
      relatedId: userId,
      priority: 'normal',
    });
  } catch (error) {
    console.warn('Login notification failed:', error.message || error);
  }
}

async function createSignupNotification(userId) {
  await createNotification({
    userId,
    sourceUserId: userId,
    title: 'Signup successful',
    message: 'Your SLMS account was created successfully.',
    type: 'security',
    module: 'auth',
    relatedModel: 'User',
    relatedId: userId,
    dedupeKey: `signup:${userId}`,
  });
}

function issueTokens(user, sessionId) {
  const payload = { id: user._id, email: user.email, role: user.role, sessionId, tokenVersion: user.tokenVersion || 0 };
  const accessToken = signToken(payload, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_EXPIRES || '15m');
  const refreshToken = signToken(payload, process.env.JWT_REFRESH_SECRET, process.env.REFRESH_TOKEN_EXPIRES || '7d');
  return { accessToken, refreshToken };
}

async function hashResetCode(code) {
  return bcrypt.hash(code, 10);
}

async function codesMatch(code, storedHash) {
  if (!storedHash || !/^\d{6}$/.test(code)) return false;
  return bcrypt.compare(code, storedHash);
}

const startEmailVerification = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 50 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8) {
    return errorResponse(res, 'A valid name, email and password are required', null, 400);
  }
  const existing = await User.findOne({ email }).select('_id');
  if (existing) return errorResponse(res, 'User already exists', null, 409);

  const otp = String(crypto.randomInt(100000, 1000000));
  const verification = await EmailVerification.findOneAndUpdate(
    { email },
    {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      otpHash: await hashResetCode(otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      lastSentAt: new Date(),
      attempts: 0,
      consumedAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  try {
    await sendSignupVerificationOtp(email, otp);
  } catch (error) {
    await EmailVerification.deleteOne({ _id: verification._id });
    throw error;
  }
  return successResponse(res, 'Verification code sent successfully.', {
    verificationId: verification._id,
    email,
  }, 200);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const verificationId = String(req.body.verificationId || '').trim();
  const code = String(req.body.otp || '').trim();
  if (!mongoose.isValidObjectId(verificationId) || !/^\d{6}$/.test(code)) {
    return errorResponse(res, 'A valid verification code is required', null, 400);
  }
  const verification = await EmailVerification.findOne({
    _id: verificationId,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!verification) return errorResponse(res, 'Code is invalid or expired', null, 400);
  if (verification.attempts >= 5) return errorResponse(res, 'Too many verification attempts', null, 429);
  if (!(await codesMatch(code, verification.otpHash))) {
    await EmailVerification.updateOne({ _id: verification._id, consumedAt: null }, { $inc: { attempts: 1 } });
    return errorResponse(res, 'Code is invalid or expired', null, 400);
  }

  const claimed = await EmailVerification.findOneAndUpdate(
    { _id: verification._id, consumedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
    { new: true },
  );
  if (!claimed) return errorResponse(res, 'Verification has already been completed', null, 409);
  try {
    const existing = await User.findOne({ email: claimed.email });
    if (existing) return errorResponse(res, 'User already exists', null, 409);
    const user = await User.create({
      name: claimed.name,
      email: claimed.email,
      passwordHash: claimed.passwordHash,
      role: 'student',
      isEmailVerified: true,
      permissions: ['view_dashboard', 'submit_requests', 'submit_complaints'],
    });
    await StudentProfile.create({
      userId: user._id,
      fullName: claimed.name,
      universityEmail: claimed.email,
      program: 'General',
    });
    await logAuthEvent({
      req,
      userId: user._id,
      email: user.email,
      eventType: 'SIGN_UP',
      status: 'SIGN_UP',
      metadata: { createdVia: 'email_verification' },
    });
    await createSignupNotification(user._id);
    await EmailVerification.deleteOne({ _id: claimed._id });
    return successResponse(res, 'Email verified. You can now login.', null, 200);
  } catch (error) {
    await EmailVerification.updateOne({ _id: claimed._id }, { $set: { consumedAt: null } });
    throw error;
  }
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const verificationId = String(req.body.verificationId || '').trim();
  if (!mongoose.isValidObjectId(verificationId)) return errorResponse(res, 'Verification session is invalid', null, 400);
  const verification = await EmailVerification.findOne({ _id: verificationId, consumedAt: null });
  if (!verification) return errorResponse(res, 'Verification session is invalid or expired', null, 400);
  if (verification.lastSentAt && Date.now() - verification.lastSentAt.getTime() < 60 * 1000) {
    return errorResponse(res, 'Please wait before requesting another code', null, 429);
  }
  const otp = String(crypto.randomInt(100000, 1000000));
  verification.otpHash = await hashResetCode(otp);
  verification.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  verification.lastSentAt = new Date();
  verification.attempts = 0;
  await verification.save();
  await sendSignupVerificationOtp(verification.email, otp);
  return successResponse(res, 'A new verification code was sent.', { email: verification.email }, 200);
});

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return errorResponse(res, 'Email and password are required', null, 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    await logAuthEvent({
      req,
      email: normalizedEmail,
      eventType: 'LOGIN_FAILED',
      status: 'LOGIN_FAILED',
      metadata: { reason: 'invalid_credentials' },
    });
    return errorResponse(res, 'Incorrect email or password', null, 401);
  }

  if (user.lockoutUntil && user.lockoutUntil <= new Date()) {
    user.lockoutUntil = null;
    user.failedLoginAttempts = 0;
    if (user.status === 'Blocked') user.status = 'Active';
    await user.save();
    await logAuthEvent({
      req, userId: user._id, email: user.email, eventType: 'ACCOUNT_UNLOCK',
      status: 'ACCOUNT_UNLOCK', metadata: { reason: 'lockout_expired' },
    });
  }

  if (user.status === 'Blocked' || (user.lockoutUntil && user.lockoutUntil > new Date())) {
    await logAuthEvent({
      req, userId: user._id, email: user.email, eventType: 'LOGIN_FAILED',
      status: 'LOGIN_FAILED', metadata: { reason: 'account_locked' },
    });
    return errorResponse(res, 'Account is temporarily locked. Please try again later.', null, 423);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    const shouldLock = user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS;
    if (shouldLock) {
      user.lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      user.status = 'Blocked';
    }
    await user.save();
    await logAuthEvent({
      req,
      userId: user._id,
      email: user.email,
      eventType: 'LOGIN_FAILED',
      status: 'LOGIN_FAILED',
      metadata: { reason: shouldLock ? 'invalid_credentials_lockout' : 'invalid_credentials' },
    });
    if (shouldLock) {
      await logAuthEvent({
        req, userId: user._id, email: user.email, eventType: 'ACCOUNT_LOCKOUT',
        status: 'ACCOUNT_LOCKOUT', metadata: { failedAttempts: user.failedLoginAttempts, durationMinutes: LOCKOUT_MINUTES },
      });
    }
    return errorResponse(res, 'Incorrect email or password', null, 401);
  }

  if (user.status !== 'Active') {
    await logAuthEvent({
      req, userId: user._id, email: user.email, eventType: 'LOGIN_FAILED',
      status: 'LOGIN_FAILED', metadata: { reason: 'account_inactive' },
    });
    return errorResponse(res, 'This account is not active', null, 403);
  }

  const activeSession = await Session.findOne({
    userId: user._id,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });

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
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  if (user.status === 'Blocked') user.status = 'Active';
  await user.save();

  const tokens = issueTokens(user, sessionId);

  await logAuthEvent({
    req,
    userId: user._id,
    email: user.email,
    eventType: 'LOGIN_SUCCESS',
    status: 'LOGIN_SUCCESS',
    sessionId,
    metadata: { rememberMe: Boolean(rememberMe) },
  });
  await createLoginNotification(user._id, req);

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
    await Session.findOneAndUpdate({ sessionId, userId: req.userId }, { status: 'logged_out', logoutAt: new Date() });
  }

  await User.updateOne({ _id: req.userId }, { $inc: { tokenVersion: 1 } });
  await logAuthEvent({
    req,
    userId: req.userId,
    email: req.user?.email,
    eventType: 'LOGOUT',
    status: 'LOGOUT',
    sessionId,
    metadata: { loggedOut: true },
  });

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

    const session = await Session.findOne({
      userId: user._id,
      sessionId: decoded.sessionId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });

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
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    return errorResponse(res, 'Current password and a new password of at least 8 characters are required', null, 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) return errorResponse(res, 'User not found', null, 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return errorResponse(res, 'Current password is incorrect', null, 400);

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return successResponse(res, 'Password updated successfully', null, 200);
});

const requestAccountDeletion = asyncHandler(async (req, res) => {
  const currentPassword = typeof req.body.currentPassword === 'string'
    ? req.body.currentPassword
    : '';
  const user = await User.findById(req.userId).select('_id email passwordHash');
  if (!user) return errorResponse(res, 'User not found', null, 404);

  const now = Date.now();
  let request = await AccountDeletionRequest.findOne({ userId: user._id });
  const passwordWasRecentlyVerified = request?.passwordVerifiedAt
    && now - request.passwordVerifiedAt.getTime() < DELETION_OTP_TTL_MS;
  const isResend = req.path.endsWith('/resend');
  if (!isResend && !currentPassword) {
    return errorResponse(res, 'Current password is required.', null, 400);
  }
  if (currentPassword) {
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) return errorResponse(res, 'Incorrect password. Please try again.', null, 401);
  } else if (!passwordWasRecentlyVerified) {
    return errorResponse(res, 'Current password verification is required.', null, 401);
  }

  if (request && request.lastSentAt && now - request.lastSentAt.getTime() < DELETION_RESEND_INTERVAL_MS) {
    return errorResponse(res, 'Please wait before requesting another code', null, 429);
  }
  if (request && now - request.sendWindowStartedAt.getTime() >= DELETION_SEND_WINDOW_MS) {
    request.sendWindowStartedAt = new Date(now);
    request.sendsInWindow = 0;
  }
  if (request && request.sendsInWindow >= DELETION_MAX_SENDS_PER_WINDOW) {
    return errorResponse(res, 'Too many deletion code requests. Please try again later.', null, 429);
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  if (!request) {
    request = new AccountDeletionRequest({
      userId: user._id,
      email: user.email,
      sendWindowStartedAt: new Date(now),
      sendsInWindow: 0,
    });
  }
  request.email = user.email;
  request.otpHash = await hashResetCode(otp);
  request.expiresAt = new Date(now + DELETION_OTP_TTL_MS);
  request.lastSentAt = new Date(now);
  request.sendsInWindow += 1;
  request.attempts = 0;
  request.passwordVerifiedAt = new Date(now);
  request.consumedAt = null;
  await request.save();

  try {
    await sendAccountDeletionOtp(user.email, otp);
  } catch (error) {
    await AccountDeletionRequest.deleteOne({ _id: request._id });
    throw error;
  }

  return successResponse(res, 'Account deletion verification code sent.', null, 200);
});

const confirmAccountDeletion = asyncHandler(async (req, res) => {
  const code = String(req.body.otp || req.body.code || '').trim();
  if (!/^\d{6}$/.test(code)) return errorResponse(res, 'A valid six-digit OTP is required', null, 400);

  const request = await AccountDeletionRequest.findOne({
    userId: req.userId,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!request) return errorResponse(res, 'Code is invalid or expired', null, 400);
  if (request.attempts >= DELETION_MAX_ATTEMPTS) return errorResponse(res, 'Too many verification attempts', null, 429);
  if (!(await codesMatch(code, request.otpHash))) {
    await AccountDeletionRequest.updateOne(
      { _id: request._id, consumedAt: null },
      { $inc: { attempts: 1 } },
    );
    return errorResponse(res, 'Code is invalid or expired', null, 400);
  }

  const claimed = await AccountDeletionRequest.findOneAndUpdate(
    { _id: request._id, userId: req.userId, consumedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
    { new: true },
  );
  if (!claimed) return errorResponse(res, 'Deletion request has already been completed', null, 409);

  try {
    await permanentlyDeleteAccount(req.userId, claimed.email);
  } catch (error) {
    await AccountDeletionRequest.updateOne({ _id: claimed._id }, { $set: { consumedAt: null } });
    throw error;
  }

  return successResponse(res, 'Account deleted permanently', null, 200);
});

const createResetToken = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return errorResponse(res, 'Email is required', null, 400);

  const user = await User.findOne({ email });
  if (!user) return errorResponse(res, 'Account not found', null, 404);

  await logAuthEvent({
    req, userId: user._id, email: user.email, eventType: 'PASSWORD_RESET',
    status: 'PASSWORD_RESET', metadata: { action: 'requested' },
  });

  const otp = String(crypto.randomInt(100000, 1000000));
  await PasswordResetToken.deleteMany({ email });
  const reset = await PasswordResetToken.create({
    userId: user._id,
    email,
    otpHash: await hashResetCode(otp),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendPasswordResetOtp(email, otp);
  } catch (error) {
    await PasswordResetToken.deleteOne({ _id: reset._id });
    throw error;
  }

  return successResponse(res, 'OTP sent to email successfully.', null, 200);
});

const verifyResetToken = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.otp || req.body.code || '').trim();

  if (!email || !/^\d{6}$/.test(code)) {
    return errorResponse(res, 'Email and a valid six-digit OTP are required', null, 400);
  }

  const reset = await PasswordResetToken.findOne({ email, consumedAt: null }).sort({ createdAt: -1 });
  if (!reset || reset.expiresAt <= new Date()) return errorResponse(res, 'Code is invalid or expired', null, 400);
  if (reset.attempts >= 5) return errorResponse(res, 'Too many verification attempts', null, 429);

  if (!(await codesMatch(code, reset.otpHash))) {
    reset.attempts += 1;
    await reset.save();
    return errorResponse(res, 'Code is invalid or expired', null, 400);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  reset.verifiedAt = new Date();
  reset.resetTokenHash = await hashResetCode(resetToken);
  reset.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await reset.save();

  return successResponse(res, 'OTP verified successfully.', { resetToken }, 200);
});

const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const resetToken = String(req.body.resetToken || '').trim();
  const legacyCode = String(req.body.code || '').trim();
  const password = String(req.body.newPassword || req.body.password || '');

  if (!email || (!resetToken && !legacyCode) || password.length < 8) {
    return errorResponse(res, 'Email, reset token and a password of at least 8 characters are required', null, 400);
  }

  const reset = await PasswordResetToken.findOne({ email, consumedAt: null }).sort({ createdAt: -1 });
  const tokenValid = resetToken
    ? reset && reset.resetTokenExpiresAt > new Date() && reset.resetTokenHash && await bcrypt.compare(resetToken, reset.resetTokenHash)
    : reset && await codesMatch(legacyCode, reset.otpHash);

  if (!reset || reset.expiresAt <= new Date() || !reset.verifiedAt || !tokenValid) {
    return errorResponse(res, 'Reset authorization is invalid or expired', null, 400);
  }

  const consumed = await PasswordResetToken.findOneAndUpdate(
    { _id: reset._id, consumedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
    { new: true },
  );

  if (!consumed) return errorResponse(res, 'Code must be verified before resetting the password', null, 400);

  const user = await User.findById(reset.userId);
  if (!user) return errorResponse(res, 'User not found', null, 404);

  user.passwordHash = await bcrypt.hash(password, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  const wasLocked = user.status === 'Blocked' || (user.lockoutUntil && user.lockoutUntil > new Date());
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  if (wasLocked) user.status = 'Active';
  await user.save();
  await PasswordResetToken.deleteOne({ _id: reset._id });
  await logAuthEvent({
    req, userId: user._id, email: user.email, eventType: 'PASSWORD_RESET_SUCCESS',
    status: 'PASSWORD_RESET_SUCCESS', metadata: { action: 'completed' },
  });
  if (wasLocked) {
    await logAuthEvent({
      req, userId: user._id, email: user.email, eventType: 'ACCOUNT_UNLOCK',
      status: 'ACCOUNT_UNLOCK', metadata: { reason: 'password_reset' },
    });
  }

  return successResponse(res, 'Password updated successfully. Please login.', null, 200);
});

const forgotPassword = createResetToken;

const getLoginHistory = asyncHandler(async (req, res) => {
  const history = await LoginHistory.find({ userId: req.user._id }).sort({ createdAt: -1, _id: -1 }).limit(50);
  return successResponse(res, 'Login history', { history }, 200);
});

module.exports = {
  startEmailVerification,
  verifyEmail,
  resendEmailVerification,
  login,
  logout,
  refreshToken,
  me,
  changePassword,
  requestAccountDeletion,
  confirmAccountDeletion,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getLoginHistory,
};
