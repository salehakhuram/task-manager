const cron = require('node-cron');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const { emitToUser, isUserOnline } = require('./socketService');
const { sendPushToUser } = require('./pushService');
const { buildMeetingStartAt } = require('../utils/reminderTime');

const REMINDER_ICON = '/vite.svg';

/**
 * Persist notification, emit Socket.IO `reminder` to the user, and send Web Push.
 * Marks deliveredToClient when the user currently has an active socket.
 */
const deliverReminder = async ({
  userId,
  title,
  message,
  description = '',
  type,
  relatedId,
  relatedModel,
}) => {
  const online = isUserOnline(userId.toString());

  const notification = await Notification.create({
    user: userId,
    title,
    message,
    description,
    type: type === 'task' || type === 'meeting' ? type : 'reminder',
    relatedId,
    relatedModel,
    icon: REMINDER_ICON,
    deliveredToClient: online,
  });

  const payload = {
    id: notification._id,
    notificationId: notification._id,
    title: notification.title,
    message: notification.message,
    description: notification.description || message,
    type: notification.type,
    icon: notification.icon || REMINDER_ICON,
    relatedId: notification.relatedId,
    relatedModel: notification.relatedModel,
    createdAt: notification.createdAt,
    missed: !online,
  };

  // Real-time event for logged-in clients
  emitToUser(userId.toString(), 'reminder', payload);
  // Keep legacy listeners working
  emitToUser(userId.toString(), 'notification', notification);

  sendPushToUser(userId, {
    title: payload.title,
    message: payload.description || payload.message,
    tag: String(notification._id),
    url: type === 'meeting' ? '/meetings' : '/tasks',
  }).catch((err) => console.error('Push notification error:', err.message));

  return notification;
};

/**
 * Atomically claim a due reminder so it is sent only once (cron + reconnect race-safe).
 */
const claimDueTask = async (filter = {}) =>
  Task.findOneAndUpdate(
    {
      status: 'pending',
      reminderSent: false,
      reminderAt: { $lte: new Date() },
      ...filter,
    },
    { $set: { reminderSent: true } },
    { new: true, sort: { reminderAt: 1 } }
  );

const claimDueMeeting = async (filter = {}) =>
  Meeting.findOneAndUpdate(
    {
      reminderSent: false,
      reminderAt: { $lte: new Date() },
      ...filter,
    },
    { $set: { reminderSent: true } },
    { new: true, sort: { reminderAt: 1 } }
  );

const processClaimedTask = async (task) => {
  if (!task) return null;
  const desc = task.description || `Due ${new Date(task.dueDate).toLocaleString()}`;
  return deliverReminder({
    userId: task.user,
    title: task.title,
    message: `Task reminder: ${task.title}`,
    description: desc,
    type: 'task',
    relatedId: task._id,
    relatedModel: 'Task',
  });
};

const processClaimedMeeting = async (meeting) => {
  if (!meeting) return null;
  const startAt = buildMeetingStartAt(meeting.date, meeting.time);
  const locationPart = meeting.location ? ` · ${meeting.location}` : '';
  const desc =
    meeting.notes ||
    `Starts ${startAt.toLocaleString()}${locationPart}`;

  return deliverReminder({
    userId: meeting.user,
    title: meeting.title,
    message: `Meeting reminder: ${meeting.title}`,
    description: desc,
    type: 'meeting',
    relatedId: meeting._id,
    relatedModel: 'Meeting',
  });
};

/** Process up to `limit` due reminders globally (used by cron). */
const processDueReminders = async (limit = 100) => {
  let processed = 0;

  while (processed < limit) {
    const task = await claimDueTask();
    if (!task) break;
    await processClaimedTask(task);
    processed += 1;
  }

  while (processed < limit) {
    const meeting = await claimDueMeeting();
    if (!meeting) break;
    await processClaimedMeeting(meeting);
    processed += 1;
  }

  return processed;
};

/**
 * On reconnect: fire any due unsent reminders for this user, then
 * re-emit undelivered notification records so the client can show them.
 */
const flushMissedRemindersForUser = async (userId) => {
  if (!userId) return { due: 0, resent: 0 };

  let due = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const task = await claimDueTask({ user: userId });
    if (!task) break;
    await processClaimedTask(task);
    due += 1;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const meeting = await claimDueMeeting({ user: userId });
    if (!meeting) break;
    await processClaimedMeeting(meeting);
    due += 1;
  }

  // Notifications already created while user was offline
  const undelivered = await Notification.find({
    user: userId,
    deliveredToClient: false,
    type: { $in: ['task', 'meeting', 'reminder'] },
  })
    .sort({ createdAt: 1 })
    .limit(50);

  let resent = 0;
  for (const notification of undelivered) {
    const payload = {
      id: notification._id,
      notificationId: notification._id,
      title: notification.title,
      message: notification.message,
      description: notification.description || notification.message,
      type: notification.type,
      icon: notification.icon || REMINDER_ICON,
      relatedId: notification.relatedId,
      relatedModel: notification.relatedModel,
      createdAt: notification.createdAt,
      missed: true,
    };

    emitToUser(userId.toString(), 'reminder', payload);
    emitToUser(userId.toString(), 'notification', notification);

    notification.deliveredToClient = true;
    await notification.save();
    resent += 1;
  }

  return { due, resent };
};

const startReminderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const count = await processDueReminders();
      if (count > 0) {
        console.log(`Reminders delivered: ${count}`);
      }
    } catch (error) {
      console.error('Reminder scheduler error:', error.message);
    }
  });

  console.log('Reminder scheduler started (every minute)');
};

module.exports = {
  startReminderScheduler,
  processDueReminders,
  flushMissedRemindersForUser,
  deliverReminder,
};
