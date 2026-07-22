const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['task', 'meeting', 'system', 'reminder'],
      default: 'system',
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedModel: {
      type: String,
      enum: ['Task', 'Meeting', null],
      default: null,
    },
    icon: {
      type: String,
      default: '/vite.svg',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    /** False until the client has received this via Socket.IO (for missed-reminder flush) */
    deliveredToClient: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, deliveredToClient: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
