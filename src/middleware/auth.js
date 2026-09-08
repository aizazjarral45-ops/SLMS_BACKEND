const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Session = require('../models/Session');
const { errorResponse } = require('../utils/apiResponse');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return errorResponse(res, 'Unauthorized', null, 401);
    }

    const token = header.split(' ')[1];

    // Admin JWTs use their own secret and Admin collection, while user JWTs
    // continue through the existing access-token validation below.
    if (process.env.JWT_SECRET) {
      try {
        const adminDecoded = jwt.verify(token, process.env.JWT_SECRET);
        if (adminDecoded.role === 'admin' && adminDecoded.id) {
          const admin = await Admin.findById(adminDecoded.id).select('-password');
          if (admin && admin.role === 'admin') {
            req.user = admin;
            req.userId = admin._id;
            req.admin = admin;
            req.session = null;
            return next();
          }
        }
      } catch (_adminError) {
        // The token may be a normal user access token; validate it below.
      }
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return errorResponse(res, 'Authentication is not configured', null, 500);
    }
 
    const decoded = jwt.verify(token, secret);
    const userId = decoded.id || decoded.userId || decoded.studentId;
    if (!userId) {
      return errorResponse(res, 'Unauthorized', null, 401);
    }
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return errorResponse(res, 'User not found', null, 401);
    }
    if (user.status === 'Blocked') {
      return errorResponse(res, 'Account is locked', null, 423);
    }
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return errorResponse(res, 'Token is no longer valid', null, 401);
    }

    const activeSession = await Session.findOne({
      userId: user._id,
      status: 'active',
      expiresAt: { $gt: new Date() },
      ...(decoded.sessionId ? { sessionId: decoded.sessionId } : {}),
    }).lean();

    if (!activeSession && process.env.SESSION_POLICY === 'single_active_session') {
      return errorResponse(res, 'Session expired or invalid', null, 401);
    }

    req.user = user;
    req.userId = user._id;
    req.session = activeSession;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return errorResponse(res, 'Unauthorized', error.message, 401);
  }
}

module.exports = authenticate;
