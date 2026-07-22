const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const { parsePagination } = require('../utils/queryHelpers');

const getNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 30 });
  const filter = { user: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  res.json({ success: true, data: notification });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  res.json({ success: true, message: 'Notification deleted' });
});

const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ success: true, message: 'All notifications cleared' });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
};
