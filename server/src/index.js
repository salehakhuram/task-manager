require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./services/socketService');
const {
  startReminderScheduler,
  flushMissedRemindersForUser,
} = require('./services/reminderService');
const { backfillReminderAt } = require('./utils/backfillReminders');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const pushRoutes = require('./routes/pushRoutes');

/** Support one or more frontend origins (comma-separated). */
const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
};

const corsOrigin = (origin, callback) => {
  const allowed = getAllowedOrigins();
  if (!origin || allowed.includes(origin) || allowed.includes('*')) {
    return callback(null, true);
  }
  console.warn(`CORS blocked origin: ${origin}`);
  return callback(null, false);
};

const bootstrap = async () => {
  await connectDB();
  await backfillReminderAt();

  const app = express();
  const server = http.createServer(app);

  // Required behind Render / reverse proxies (HTTPS + Socket.IO)
  app.set('trust proxy', 1);

  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
    // Prefer websocket; fall back to polling on restrictive hosts
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  initSocket(io, {
    onConnect: async (userId) => {
      const result = await flushMissedRemindersForUser(userId);
      if (result.due || result.resent) {
        console.log(
          `Flushed reminders for ${userId}: due=${result.due}, resent=${result.resent}`
        );
      }
    },
  });

  // node-cron: keeps checking reminders every minute while this process is alive
  startReminderScheduler();

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Task Manager API is running',
      env: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/push', pushRoutes);

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`Allowed CORS origins: ${getAllowedOrigins().join(', ')}`);
  });
};

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
