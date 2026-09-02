const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.CLIENT_URL,
        process.env.ADMIN_URL,
      ].filter(Boolean),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-user-room', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('join-admin-room', () => {
      socket.join('admin-room');
    });
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

module.exports = { initSocket, emitToUser };
