const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;
const userSockets = new Map();
let onUserConnected = null;

const initSocket = (socketIo, { onConnect } = {}) => {
  io = socketIo;
  if (typeof onConnect === 'function') onUserConnected = onConnect;

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email');
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    socket.join(`user:${userId}`);
    console.log(`Socket connected: ${socket.user.name} (${socket.id})`);

    // Flush missed / due reminders as soon as the user comes online
    if (onUserConnected) {
      Promise.resolve(onUserConnected(userId, socket)).catch((err) =>
        console.error('onUserConnected error:', err.message)
      );
    }

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const emitToUser = (userId, event, data) => {
  if (!io) return false;
  io.to(`user:${userId}`).emit(event, data);
  return isUserOnline(userId);
};

const isUserOnline = (userId) => {
  const sockets = userSockets.get(String(userId));
  return Boolean(sockets && sockets.size > 0);
};

const getIO = () => io;

module.exports = { initSocket, emitToUser, isUserOnline, getIO };
