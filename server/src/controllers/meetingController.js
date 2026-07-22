const Meeting = require('../models/Meeting');
const { asyncHandler } = require('../middleware/errorHandler');
const { resolveReminderAt, buildMeetingStartAt } = require('../utils/reminderTime');

const assertNotPastMeeting = (dateValue, timeValue, res) => {
  const when = buildMeetingStartAt(dateValue, timeValue);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
    res.status(400);
    throw new Error('Meeting cannot be scheduled in the past');
  }
};

const getMeetings = asyncHandler(async (req, res) => {
  const { search, from, to, sort = 'date', page = 1, limit = 50 } = req.query;
  const filter = { user: req.user._id };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [meetings, total] = await Promise.all([
    Meeting.find(filter).sort(sort).skip(skip).limit(Number(limit)),
    Meeting.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: meetings,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
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
  const { title, date, time, location, notes, reminder, reminderAt } = req.body;

  if (!title || !date || !time) {
    res.status(400);
    throw new Error('Title, date, and time are required');
  }

  assertNotPastMeeting(date, time, res);

  const reminderMinutes = reminder ?? 15;
  const startAt = buildMeetingStartAt(date, time);
  const resolvedReminderAt = resolveReminderAt({
    eventAt: startAt,
    reminderMinutes,
    reminderAt,
  });

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

  const fields = ['title', 'date', 'time', 'location', 'notes', 'reminder'];
  let scheduleChanged = false;

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (
        ['date', 'time', 'reminder'].includes(field) &&
        String(req.body[field]) !== String(meeting[field])
      ) {
        scheduleChanged = true;
      }
      meeting[field] = req.body[field];
    }
  });

  if (req.body.reminderAt !== undefined) {
    const next = new Date(req.body.reminderAt);
    if (
      Number.isNaN(next.getTime()) ||
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

  assertNotPastMeeting(meeting.date, meeting.time, res);

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
