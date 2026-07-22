const mongoose = require('mongoose');

const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60, 1440];

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    /** Minutes before dueDate (preset). Used to derive reminderAt when not set explicitly. */
    reminder: {
      type: Number,
      enum: REMINDER_OPTIONS,
      default: 15,
    },
    /** Absolute datetime when the desktop/socket reminder should fire */
    reminderAt: {
      type: Date,
      index: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ reminderSent: 1, reminderAt: 1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.REMINDER_OPTIONS = REMINDER_OPTIONS;
