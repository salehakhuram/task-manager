const Task = require('../models/Task');
const { asyncHandler } = require('../middleware/errorHandler');
const { resolveReminderAt } = require('../utils/reminderTime');

const getTasks = asyncHandler(async (req, res) => {
  const {
    status,
    priority,
    category,
    search,
    from,
    to,
    sort = '-dueDate',
    page = 1,
    limit = 50,
  } = req.query;

  const filter = { user: req.user._id };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = new RegExp(`^${category}$`, 'i');
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (from || to) {
    filter.dueDate = {};
    if (from) filter.dueDate.$gte = new Date(from);
    if (to) filter.dueDate.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [tasks, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(Number(limit)),
    Task.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: tasks,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
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
  const { title, description, priority, category, dueDate, reminder, reminderAt } = req.body;

  if (!title || !dueDate) {
    res.status(400);
    throw new Error('Title and due date are required');
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
    res.status(400);
    throw new Error('Please select a future date and time for the task');
  }

  const reminderMinutes = reminder ?? 15;
  const resolvedReminderAt = resolveReminderAt({
    eventAt: dueDate,
    reminderMinutes,
    reminderAt,
  });

  const task = await Task.create({
    user: req.user._id,
    title,
    description,
    priority,
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

  const fields = ['title', 'description', 'priority', 'category', 'dueDate', 'reminder', 'status'];
  let scheduleChanged = false;

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (
        (field === 'dueDate' &&
          new Date(req.body.dueDate).getTime() !== new Date(task.dueDate).getTime()) ||
        (field === 'reminder' && Number(req.body.reminder) !== Number(task.reminder))
      ) {
        scheduleChanged = true;
      }
      task[field] = req.body[field];
    }
  });

  if (req.body.reminderAt !== undefined) {
    const next = new Date(req.body.reminderAt);
    if (
      Number.isNaN(next.getTime()) ||
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

  // Pending tasks cannot be moved into the past
  if (task.status === 'pending') {
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      res.status(400);
      throw new Error('Please select a future date and time for the task');
    }
  }

  // Ensure reminderAt always exists
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

  task.status = task.status === 'completed' ? 'pending' : 'completed';
  task.completedAt = task.status === 'completed' ? new Date() : null;
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
