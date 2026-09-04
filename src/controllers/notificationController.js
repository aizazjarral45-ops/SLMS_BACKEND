const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isValidObjectId } = require('../utils/objectId');
const { ensureDerivedNotifications } = require('../services/notificationService');

const ownerFilter = (userId) => ({
  $or: [{ recipientId: userId }, { recipientId: null, userId }],
});
const unreadFilter = {
  $or: [{ isRead: false }, { isRead: { $exists: false }, read: false }],
};

const getNotifications = asyncHandler(async (req, res) => {
  await ensureDerivedNotifications(req.userId);
  const notifications = await Notification.find(ownerFilter(req.userId)).sort({ createdAt: -1, _id: -1 });
  return successResponse(res, 'Notifications', { notifications }, 200);
});
const getUnreadNotifications = asyncHandler(async (req, res) => {
  await ensureDerivedNotifications(req.userId);
  const notifications = await Notification.find({ $and: [ownerFilter(req.userId), unreadFilter] }).sort({ createdAt: -1, _id: -1 });
  return successResponse(res, 'Unread notifications', { notifications }, 200);
});
const unreadCount = asyncHandler(async (req, res) => {
  await ensureDerivedNotifications(req.userId);
  const count = await Notification.countDocuments({ $and: [ownerFilter(req.userId), unreadFilter] });
  return successResponse(res, 'Unread notification count', { count }, 200);
});
const markAsRead = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Invalid notification ID', null, 400);
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...ownerFilter(req.userId) },
    { $set: { read: true, isRead: true, readAt: new Date() } },
    { new: true },
  );
  if (!notification) return errorResponse(res, 'Notification not found', null, 404);
  return successResponse(res, 'Notification marked as read', { notification }, 200);
});
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { $and: [ownerFilter(req.userId), unreadFilter] },
    { $set: { read: true, isRead: true, readAt: new Date() } },
  );
  return successResponse(res, 'All notifications marked as read', {}, 200);
});
const markAsUnread = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return errorResponse(res, 'Invalid notification ID', null, 400);
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...ownerFilter(req.userId) },
    { $set: { read: false, isRead: false, readAt: null } },
    { new: true },
  );
  if (!notification) return errorResponse(res, 'Notification not found', null, 404);
  return successResponse(res, 'Notification marked as unread', { notification }, 200);
});
const deleteNotification = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return errorResponse(res, 'Invalid notification ID', null, 400);
  }
  const deleted = await Notification.findOneAndDelete({ _id: req.params.id, ...ownerFilter(req.userId) });
  if (!deleted) return errorResponse(res, 'Notification not found', null, 404);
  return successResponse(res, 'Notification deleted', {}, 200);
});
module.exports = { getNotifications, getUnreadNotifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification };
