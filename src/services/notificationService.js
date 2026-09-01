const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('../config/socket');

async function createNotification({ userId, sourceUserId = null, title, message, type = 'general', module = 'system', relatedModel = '', relatedId = null, notifyAdmins = false }) {
  const recipients = [];
  if (userId) recipients.push(userId);
  if (notifyAdmins) {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] }, status: 'Active' }).select('_id').lean();
    admins.forEach((admin) => recipients.push(admin._id));
  }
  const recipientIds = [...new Set(recipients.filter(Boolean).map((id) => id.toString()))];
  const notifications = await Notification.insertMany(recipientIds.map((recipientId) => ({
    recipientId,
    senderId: sourceUserId,
    userId: recipientId,
    sourceUserId,
    title,
    message,
    type,
    module,
    relatedModel,
    relatedId,
    isRead: false,
  })));
  notifications.forEach((notification) => emitToUser(notification.userId.toString(), 'new-notification', {
    id: notification._id.toString(), title, message, type, module, read: false, createdAt: notification.createdAt,
  }));
  return notifications[0] || null;
}

module.exports = { createNotification };
