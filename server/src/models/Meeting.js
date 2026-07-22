const mongoose = require('mongoose');
const { REMINDER_OPTIONS } = require('./Task');

const meetingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Meeting date is required'],
    },
    time: {
      type: String,
      required: [true, 'Meeting time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM (24h)'],
    },
    location: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Location cannot exceed 300 characters'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    reminder: {
      type: Number,
      enum: REMINDER_OPTIONS,
      default: 15,
    },
    reminderAt: {
      type: Date,
      index: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

meetingSchema.index({ user: 1, date: 1 });
meetingSchema.index({ reminderSent: 1, reminderAt: 1 });

meetingSchema.virtual('startAt').get(function getStartAt() {
  const d = new Date(this.date);
  const [hours, minutes] = this.time.split(':').map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
});

meetingSchema.set('toJSON', { virtuals: true });
meetingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Meeting', meetingSchema);
