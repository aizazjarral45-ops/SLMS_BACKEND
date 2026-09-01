const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ $or: [{ userId: req.user._id }, { recipientId: req.user._id }] }).sort({ createdAt: -1 });
  return successResponse(res, 'Notifications', { notifications }, 200);
});
const getUnreadNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ $or: [{ userId: req.user._id, read: false }, { recipientId: req.user._id, isRead: false }] }).sort({ createdAt: -1 });
  return successResponse(res, 'Unread notifications', { notifications }, 200);
});
const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ $or: [{ userId: req.user._id, read: false }, { recipientId: req.user._id, isRead: false }] });
  return successResponse(res, 'Unread notification count', { count }, 200);
});
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ userId: req.user._id }, { recipientId: req.user._id }] },
    { $set: { read: true, isRead: true, readAt: new Date() } },
    { new: true },
  );
  if (!notification) return errorResponse(res, 'Notification not found', null, 404);
  return successResponse(res, 'Notification marked as read', { notification }, 200);
});
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { $or: [{ userId: req.user._id, read: false }, { recipientId: req.user._id, isRead: false }] },
    { $set: { read: true, isRead: true, readAt: new Date() } },
  );
  return successResponse(res, 'All notifications marked as read', {}, 200);
});
const deleteNotification = asyncHandler(async (req, res) => {
  const deleted = await Notification.findOneAndDelete({ _id: req.params.id, $or: [{ userId: req.user._id }, { recipientId: req.user._id }] });
  if (!deleted) return errorResponse(res, 'Notification not found', null, 404);
  return successResponse(res, 'Notification deleted', {}, 200);
});
module.exports = { getNotifications, getUnreadNotifications, unreadCount, markAsRead, markAllAsRead, deleteNotification };
