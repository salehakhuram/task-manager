const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

const startOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const upcomingEnd = endOfDay(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const [
    todayTasks,
    upcomingTasks,
    pendingCount,
    completedCount,
    todayMeetings,
    upcomingMeetings,
    recentNotifications,
  ] = await Promise.all([
    Task.find({
      user: userId,
      dueDate: { $gte: todayStart, $lte: todayEnd },
    }).sort('dueDate'),
    Task.find({
      user: userId,
      status: 'pending',
      dueDate: { $gt: todayEnd, $lte: upcomingEnd },
    })
      .sort('dueDate')
      .limit(10),
    Task.countDocuments({ user: userId, status: 'pending' }),
    Task.countDocuments({ user: userId, status: 'completed' }),
    Meeting.find({
      user: userId,
      date: { $gte: todayStart, $lte: todayEnd },
    }).sort('time'),
    Meeting.find({
      user: userId,
      date: { $gt: todayEnd, $lte: upcomingEnd },
    })
      .sort('date')
      .limit(10),
    Notification.find({ user: userId }).sort('-createdAt').limit(8),
  ]);

  res.json({
    success: true,
    data: {
      counts: {
        pending: pendingCount,
        completed: completedCount,
        todayTasks: todayTasks.length,
        todayMeetings: todayMeetings.length,
      },
      todayTasks,
      upcomingTasks,
      todayMeetings,
      upcomingMeetings,
      recentNotifications,
    },
  });
});

const getCalendarEvents = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400);
    throw new Error('from and to query params are required');
  }

  const range = { $gte: new Date(from), $lte: new Date(to) };
  const userId = req.user._id;

  const [tasks, meetings] = await Promise.all([
    Task.find({ user: userId, dueDate: range }),
    Meeting.find({ user: userId, date: range }),
  ]);

  const events = [
    ...tasks.map((t) => ({
      id: t._id,
      type: 'task',
      title: t.title,
      date: t.dueDate,
      priority: t.priority,
      status: t.status,
      category: t.category,
      data: t,
    })),
    ...meetings.map((m) => ({
      id: m._id,
      type: 'meeting',
      title: m.title,
      date: m.date,
      time: m.time,
      location: m.location,
      data: m,
    })),
  ];

  res.json({ success: true, data: events });
});

module.exports = { getDashboard, getCalendarEvents };
