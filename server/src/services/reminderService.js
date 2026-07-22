const cron = require('node-cron');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const { emitToUser, isUserOnline } = require('./socketService');
const { sendPushToUser } = require('./pushService');
const { buildMeetingStartAt } = require('../utils/reminderTime');

const REMINDER_ICON = '/vite.svg';
/** If reminder fires more than this late, treat as overdue / time passed */
const OVERDUE_MS = 60 * 1000;

const isOverdueReminder = (reminderAt) => {
  if (!reminderAt) return false;
  return Date.now() - new Date(reminderAt).getTime() > OVERDUE_MS;
};

const formatWhen = (date) => {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
};

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
  overdue = false,
}) => {
  const online = isUserOnline(userId.toString());

  const displayTitle = overdue ? `Time passed: ${title}` : title;
  const displayMessage = overdue
    ? `Ye waqt guzar gaya hai — ${message}`
    : message;
  const displayDescription = overdue
    ? `Ye waqt guzar gaya hai. ${description}`
    : description;

  const notification = await Notification.create({
    user: userId,
    title: displayTitle,
    message: displayMessage,
    description: displayDescription,
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
    description: notification.description || displayMessage,
    type: notification.type,
    icon: notification.icon || REMINDER_ICON,
    relatedId: notification.relatedId,
    relatedModel: notification.relatedModel,
    createdAt: notification.createdAt,
    missed: !online || overdue,
    overdue,
  };

  emitToUser(userId.toString(), 'reminder', payload);
  emitToUser(userId.toString(), 'notification', notification);

  sendPushToUser(userId, {
    title: payload.title,
    message: payload.description || payload.message,
    tag: String(notification._id),
    url: type === 'meeting' ? '/meetings' : '/tasks',
  }).catch((err) => console.error('Push notification error:', err.message));

  return notification;
};

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
  const overdue = isOverdueReminder(task.reminderAt);
  const dueText = `Due ${formatWhen(task.dueDate)}`;
  const desc = task.description
    ? `${task.description} · ${dueText}`
    : dueText;

  return deliverReminder({
    userId: task.user,
    title: task.title,
    message: overdue
      ? `Task ka reminder time guzar gaya hai (${formatWhen(task.reminderAt)})`
      : `Task reminder: ${task.title}`,
    description: desc,
    type: 'task',
    relatedId: task._id,
    relatedModel: 'Task',
    overdue,
  });
};

const processClaimedMeeting = async (meeting) => {
  if (!meeting) return null;
  const overdue = isOverdueReminder(meeting.reminderAt);
  const startAt = buildMeetingStartAt(meeting.date, meeting.time);
  const locationPart = meeting.location ? ` · ${meeting.location}` : '';
  const desc =
    meeting.notes ||
    `Starts ${formatWhen(startAt)}${locationPart}`;

  return deliverReminder({
    userId: meeting.user,
    title: meeting.title,
    message: overdue
      ? `Meeting ka reminder time guzar gaya hai (${formatWhen(meeting.reminderAt)})`
      : `Meeting reminder: ${meeting.title}`,
    description: desc,
    type: 'meeting',
    relatedId: meeting._id,
    relatedModel: 'Meeting',
    overdue,
  });
};

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

  const undelivered = await Notification.find({
    user: userId,
    deliveredToClient: false,
    type: { $in: ['task', 'meeting', 'reminder'] },
  })
    .sort({ createdAt: 1 })
    .limit(50);

  let resent = 0;
  for (const notification of undelivered) {
    const alreadyMarked =
      /guzar|passed|Time passed/i.test(notification.title || '') ||
      /guzar|passed/i.test(notification.message || '');

    const title = alreadyMarked
      ? notification.title
      : `Time passed: ${notification.title}`;
    const description = alreadyMarked
      ? notification.description || notification.message
      : `Ye waqt guzar gaya hai. ${notification.description || notification.message}`;

    const payload = {
      id: notification._id,
      notificationId: notification._id,
      title,
      message: alreadyMarked
        ? notification.message
        : `Ye waqt guzar gaya hai — ${notification.message}`,
      description,
      type: notification.type,
      icon: notification.icon || REMINDER_ICON,
      relatedId: notification.relatedId,
      relatedModel: notification.relatedModel,
      createdAt: notification.createdAt,
      missed: true,
      overdue: true,
    };

    emitToUser(userId.toString(), 'reminder', payload);
    emitToUser(userId.toString(), 'notification', {
      ...notification.toObject(),
      title: payload.title,
      message: payload.message,
      description: payload.description,
    });

    notification.deliveredToClient = true;
    if (!alreadyMarked) {
      notification.title = payload.title;
      notification.message = payload.message;
      notification.description = payload.description;
    }
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
