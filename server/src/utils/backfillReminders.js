const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const { computeReminderAt, buildMeetingStartAt } = require('../utils/reminderTime');

/**
 * Backfill reminderAt for legacy documents created before the field existed.
 */
const backfillReminderAt = async () => {
  const tasks = await Task.find({
    reminderSent: false,
    $or: [{ reminderAt: null }, { reminderAt: { $exists: false } }],
  }).limit(500);

  for (const task of tasks) {
    task.reminderAt = computeReminderAt(task.dueDate, task.reminder ?? 15);
    await task.save();
  }

  const meetings = await Meeting.find({
    reminderSent: false,
    $or: [{ reminderAt: null }, { reminderAt: { $exists: false } }],
  }).limit(500);

  for (const meeting of meetings) {
    const startAt = buildMeetingStartAt(meeting.date, meeting.time);
    meeting.reminderAt = computeReminderAt(startAt, meeting.reminder ?? 15);
    await meeting.save();
  }

  if (tasks.length || meetings.length) {
    console.log(
      `Backfilled reminderAt — tasks: ${tasks.length}, meetings: ${meetings.length}`
    );
  }
};

module.exports = { backfillReminderAt };
