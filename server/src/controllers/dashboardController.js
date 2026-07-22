const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Day bounds in the user's local timezone.
 * tzOffset = Date#getTimezoneOffset() (minutes to add to local to get UTC).
 */
const getLocalDayBounds = (tzOffset = 0, base = new Date()) => {
  const offsetMs = Number(tzOffset) * 60 * 1000;
  const local = new Date(base.getTime() - offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  const todayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) + offsetMs);
  const todayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) + offsetMs);
  const upcomingEnd = new Date(todayStart.getTime() + 8 * 24 * 60 * 60 * 1000 - 1);

  return { todayStart, todayEnd, upcomingEnd, now: base };
};

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const tzOffset = Number(req.query.tzOffset);
  const { todayStart, todayEnd, upcomingEnd, now } = getLocalDayBounds(
    Number.isFinite(tzOffset) ? tzOffset : 0
  );

  const [
    todayTasks,
    upcomingTasks,
    pendingCount,
    completedCount,
    todayMeetings,
    upcomingMeetings,
    recentNotifications,
  ] = await Promise.all([
    // All tasks due sometime today (user's local calendar day)
    Task.find({
      user: userId,
      dueDate: { $gte: todayStart, $lte: todayEnd },
    }).sort('dueDate'),

    // Pending tasks from later today through next 7 days
    Task.find({
      user: userId,
      status: 'pending',
      dueDate: { $gt: now, $lte: upcomingEnd },
    })
      .sort('dueDate')
      .limit(15),

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

  // Prefer pending today's tasks first in the list
  const sortedToday = [...todayTasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  res.json({
    success: true,
    data: {
      counts: {
        pending: pendingCount,
        completed: completedCount,
        todayTasks: todayTasks.filter((t) => t.status === 'pending').length,
        todayMeetings: todayMeetings.length,
        upcomingTasks: upcomingTasks.length,
      },
      todayTasks: sortedToday,
      upcomingTasks,
      todayMeetings,
      upcomingMeetings,
      recentNotifications,
      meta: {
        todayStart,
        todayEnd,
        tzOffset: Number.isFinite(tzOffset) ? tzOffset : 0,
      },
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
