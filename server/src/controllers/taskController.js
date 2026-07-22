const Task = require('../models/Task');
const { asyncHandler } = require('../middleware/errorHandler');
const { resolveReminderAt } = require('../utils/reminderTime');
const {
  escapeRegex,
  parsePagination,
  parseSort,
  ALLOWED_TASK_SORT,
  trimText,
} = require('../utils/queryHelpers');

const PRIORITIES = new Set(['low', 'medium', 'high']);
const STATUSES = new Set(['pending', 'completed']);
const REMINDERS = new Set([0, 5, 10, 15, 30, 60, 1440]);

const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, category, search, from, to } = req.query;
  const sort = parseSort(req.query.sort, ALLOWED_TASK_SORT, '-dueDate');
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { user: req.user._id };

  if (status && STATUSES.has(status)) filter.status = status;
  if (priority && PRIORITIES.has(priority)) filter.priority = priority;
  if (category) {
    const cat = String(category).slice(0, 50);
    filter.category = new RegExp(`^${escapeRegex(cat)}$`, 'i');
  }
  if (search) {
    const q = escapeRegex(String(search).slice(0, 100));
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }
  if (from || to) {
    filter.dueDate = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) filter.dueDate.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) filter.dueDate.$lte = d;
    }
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: tasks,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  res.json({ success: true, data: task });
});

const createTask = asyncHandler(async (req, res) => {
  const title = trimText(req.body.title, 200);
  const description = trimText(req.body.description, 2000);
  const category = trimText(req.body.category, 50) || 'General';
  const { priority, dueDate, reminder, reminderAt } = req.body;

  if (!title || !dueDate) {
    res.status(400);
    throw new Error('Title and due date are required');
  }

  if (priority && !PRIORITIES.has(priority)) {
    res.status(400);
    throw new Error('Invalid priority');
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
    res.status(400);
    throw new Error('Please select a future date and time for the task');
  }

  const reminderMinutes = Number(reminder ?? 15);
  if (!REMINDERS.has(reminderMinutes)) {
    res.status(400);
    throw new Error('Invalid reminder option');
  }

  const resolvedReminderAt = resolveReminderAt({
    eventAt: dueDate,
    reminderMinutes,
    reminderAt,
  });

  if (Number.isNaN(new Date(resolvedReminderAt).getTime())) {
    res.status(400);
    throw new Error('Invalid reminder date and time');
  }

  const task = await Task.create({
    user: req.user._id,
    title,
    description,
    priority: priority || 'medium',
    category,
    dueDate,
    reminder: reminderMinutes,
    reminderAt: resolvedReminderAt,
    reminderSent: false,
  });

  res.status(201).json({ success: true, data: task });
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  let scheduleChanged = false;

  if (req.body.title !== undefined) {
    const title = trimText(req.body.title, 200);
    if (!title) {
      res.status(400);
      throw new Error('Title is required');
    }
    task.title = title;
  }
  if (req.body.description !== undefined) {
    task.description = trimText(req.body.description, 2000);
  }
  if (req.body.category !== undefined) {
    task.category = trimText(req.body.category, 50) || 'General';
  }
  if (req.body.priority !== undefined) {
    if (!PRIORITIES.has(req.body.priority)) {
      res.status(400);
      throw new Error('Invalid priority');
    }
    task.priority = req.body.priority;
  }
  if (req.body.status !== undefined) {
    if (!STATUSES.has(req.body.status)) {
      res.status(400);
      throw new Error('Invalid status');
    }
    task.status = req.body.status;
  }
  if (req.body.dueDate !== undefined) {
    const nextDue = new Date(req.body.dueDate);
    if (Number.isNaN(nextDue.getTime())) {
      res.status(400);
      throw new Error('Invalid due date');
    }
    if (nextDue.getTime() !== new Date(task.dueDate).getTime()) {
      scheduleChanged = true;
    }
    task.dueDate = nextDue;
  }
  if (req.body.reminder !== undefined) {
    const reminderMinutes = Number(req.body.reminder);
    if (!REMINDERS.has(reminderMinutes)) {
      res.status(400);
      throw new Error('Invalid reminder option');
    }
    if (reminderMinutes !== Number(task.reminder)) scheduleChanged = true;
    task.reminder = reminderMinutes;
  }

  if (req.body.reminderAt !== undefined) {
    const next = new Date(req.body.reminderAt);
    if (Number.isNaN(next.getTime())) {
      res.status(400);
      throw new Error('Invalid reminder date and time');
    }
    if (
      !task.reminderAt ||
      next.getTime() !== new Date(task.reminderAt).getTime()
    ) {
      scheduleChanged = true;
    }
    task.reminderAt = next;
  } else if (scheduleChanged) {
    task.reminderAt = resolveReminderAt({
      eventAt: task.dueDate,
      reminderMinutes: task.reminder,
    });
  }

  if (req.body.status === 'completed') {
    task.completedAt = task.completedAt || new Date();
  }
  if (req.body.status === 'pending') {
    task.completedAt = null;
  }
  if (scheduleChanged) {
    task.reminderSent = false;
  }

  if (task.status === 'pending') {
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      res.status(400);
      throw new Error('Please select a future date and time for the task');
    }
  }

  if (!task.reminderAt) {
    task.reminderAt = resolveReminderAt({
      eventAt: task.dueDate,
      reminderMinutes: task.reminder,
    });
  }

  await task.save();
  res.json({ success: true, data: task });
});

const toggleComplete = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const nextStatus = task.status === 'completed' ? 'pending' : 'completed';

  // Re-opening a completed task requires a future due date
  if (nextStatus === 'pending') {
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      res.status(400);
      throw new Error('Update the due date to a future time before marking this task pending');
    }
  }

  task.status = nextStatus;
  task.completedAt = nextStatus === 'completed' ? new Date() : null;
  await task.save();

  res.json({ success: true, data: task });
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  res.json({ success: true, message: 'Task deleted' });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Task.distinct('category', { user: req.user._id });
  res.json({ success: true, data: categories.filter(Boolean) });
});

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  toggleComplete,
  deleteTask,
  getCategories,
};
