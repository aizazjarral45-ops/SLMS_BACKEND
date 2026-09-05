const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5176',
        process.env.CLIENT_URL,
        process.env.ADMIN_URL,
      ].filter(Boolean),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (!token || !process.env.JWT_ACCESS_SECRET) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = decoded.id || decoded.userId || decoded.studentId;
      if (!userId) return next(new Error('Unauthorized'));

      const user = await User.findById(userId).select('_id role status tokenVersion').lean();
      if (!user || user.status === 'Blocked' || (decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
        return next(new Error('Unauthorized'));
      }

      if (process.env.SESSION_POLICY === 'single_active_session') {
        const activeSession = await Session.exists({
          userId: user._id,
          status: 'active',
          expiresAt: { $gt: new Date() },
          ...(decoded.sessionId ? { sessionId: decoded.sessionId } : {}),
        });
        if (!activeSession) return next(new Error('Session expired or invalid'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (['admin', 'super_admin'].includes(socket.userRole)) socket.join('admin-room');
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

function emitToAdmins(event, payload) {
  if (io) io.to('admin-room').emit(event, payload);
}

function emitDataChange({ userId, resource, action, record = null, id = null }) {
  if (!userId) return;
  emitToUser(userId.toString(), 'data:changed', {
    resource,
    action,
    id: id || record?._id?.toString() || null,
  });
}

module.exports = { initSocket, emitToUser, emitToAdmins, emitDataChange };
