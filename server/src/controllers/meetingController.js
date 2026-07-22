const Meeting = require('../models/Meeting');
const { asyncHandler } = require('../middleware/errorHandler');
const { resolveReminderAt, buildMeetingStartAt } = require('../utils/reminderTime');
const {
  escapeRegex,
  parsePagination,
  parseSort,
  ALLOWED_MEETING_SORT,
  trimText,
} = require('../utils/queryHelpers');

const REMINDERS = new Set([0, 5, 10, 15, 30, 60, 1440]);
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const assertNotPastMeeting = (dateValue, timeValue, res) => {
  const when = buildMeetingStartAt(dateValue, timeValue);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
    res.status(400);
    throw new Error('Meeting cannot be scheduled in the past');
  }
};

const getMeetings = asyncHandler(async (req, res) => {
  const { search, from, to } = req.query;
  const sort = parseSort(req.query.sort, ALLOWED_MEETING_SORT, 'date');
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id };

  if (search) {
    const q = escapeRegex(String(search).slice(0, 100));
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { location: { $regex: q, $options: 'i' } },
      { notes: { $regex: q, $options: 'i' } },
    ];
  }
  if (from || to) {
    filter.date = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) filter.date.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) filter.date.$lte = d;
    }
  }

  const [meetings, total] = await Promise.all([
    Meeting.find(filter).sort(sort).skip(skip).limit(limit),
    Meeting.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: meetings,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

const getMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user._id });
  if (!meeting) {
    res.status(404);
    throw new Error('Meeting not found');
  }
  res.json({ success: true, data: meeting });
});

const createMeeting = asyncHandler(async (req, res) => {
  const title = trimText(req.body.title, 200);
  const location = trimText(req.body.location, 300);
  const notes = trimText(req.body.notes, 2000);
  const { date, time, reminder, reminderAt } = req.body;

  if (!title || !date || !time) {
    res.status(400);
    throw new Error('Title, date, and time are required');
  }

  if (!TIME_REGEX.test(String(time))) {
    res.status(400);
    throw new Error('Enter a valid time (HH:MM)');
  }

  assertNotPastMeeting(date, time, res);

  const reminderMinutes = Number(reminder ?? 15);
  if (!REMINDERS.has(reminderMinutes)) {
    res.status(400);
    throw new Error('Invalid reminder option');
  }

  const startAt = buildMeetingStartAt(date, time);
  const resolvedReminderAt = resolveReminderAt({
    eventAt: startAt,
    reminderMinutes,
    reminderAt,
  });

  if (Number.isNaN(new Date(resolvedReminderAt).getTime())) {
    res.status(400);
    throw new Error('Invalid reminder date and time');
  }

  const meeting = await Meeting.create({
    user: req.user._id,
    title,
    date,
    time,
    location,
    notes,
    reminder: reminderMinutes,
    reminderAt: resolvedReminderAt,
    reminderSent: false,
  });

  res.status(201).json({ success: true, data: meeting });
});

const updateMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user._id });
  if (!meeting) {
    res.status(404);
    throw new Error('Meeting not found');
  }

  let scheduleChanged = false;

  if (req.body.title !== undefined) {
    const title = trimText(req.body.title, 200);
    if (!title) {
      res.status(400);
      throw new Error('Title is required');
    }
    meeting.title = title;
  }
  if (req.body.location !== undefined) {
    meeting.location = trimText(req.body.location, 300);
  }
  if (req.body.notes !== undefined) {
    meeting.notes = trimText(req.body.notes, 2000);
  }
  if (req.body.date !== undefined) {
    if (String(req.body.date) !== String(meeting.date)) scheduleChanged = true;
    meeting.date = req.body.date;
  }
  if (req.body.time !== undefined) {
    if (!TIME_REGEX.test(String(req.body.time))) {
      res.status(400);
      throw new Error('Enter a valid time (HH:MM)');
    }
    if (String(req.body.time) !== String(meeting.time)) scheduleChanged = true;
    meeting.time = req.body.time;
  }
  if (req.body.reminder !== undefined) {
    const reminderMinutes = Number(req.body.reminder);
    if (!REMINDERS.has(reminderMinutes)) {
      res.status(400);
      throw new Error('Invalid reminder option');
    }
    if (reminderMinutes !== Number(meeting.reminder)) scheduleChanged = true;
    meeting.reminder = reminderMinutes;
  }

  if (req.body.reminderAt !== undefined) {
    const next = new Date(req.body.reminderAt);
    if (Number.isNaN(next.getTime())) {
      res.status(400);
      throw new Error('Invalid reminder date and time');
    }
    if (
      !meeting.reminderAt ||
      next.getTime() !== new Date(meeting.reminderAt).getTime()
    ) {
      scheduleChanged = true;
    }
    meeting.reminderAt = next;
  } else if (scheduleChanged) {
    const startAt = buildMeetingStartAt(meeting.date, meeting.time);
    meeting.reminderAt = resolveReminderAt({
      eventAt: startAt,
      reminderMinutes: meeting.reminder,
    });
  }

  // Only enforce future schedule when date/time actually changes
  if (scheduleChanged && (req.body.date !== undefined || req.body.time !== undefined)) {
    assertNotPastMeeting(meeting.date, meeting.time, res);
  }

  if (scheduleChanged) meeting.reminderSent = false;

  if (!meeting.reminderAt) {
    const startAt = buildMeetingStartAt(meeting.date, meeting.time);
    meeting.reminderAt = resolveReminderAt({
      eventAt: startAt,
      reminderMinutes: meeting.reminder,
    });
  }

  await meeting.save();
  res.json({ success: true, data: meeting });
});

const deleteMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!meeting) {
    res.status(404);
    throw new Error('Meeting not found');
  }
  res.json({ success: true, message: 'Meeting deleted' });
});

module.exports = {
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  deleteMeeting,
};
