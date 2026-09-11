const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { errorResponse } = require('../utils/apiResponse');

async function authenticateAdmin(req, res, next) {
  try {
    const header = req.headers.authorization;
    const secret = process.env.JWT_SECRET;
    if (!secret || !header || !header.startsWith('Bearer ')) {
      return errorResponse(res, 'Unauthorized', null, 401);
    }

    const decoded = jwt.verify(header.slice('Bearer '.length), secret);
    if (decoded.role !== 'admin' || !decoded.id) {
      return errorResponse(res, 'Unauthorized', null, 401);
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || admin.role !== 'admin' || (decoded.tokenVersion || 0) !== (admin.tokenVersion || 0)) {
      return errorResponse(res, 'Unauthorized', null, 401);
    }

    req.admin = admin;
    req.adminId = admin._id;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error.message || error);
    return errorResponse(res, 'Unauthorized', null, 401);
  }
}

module.exports = authenticateAdmin;
