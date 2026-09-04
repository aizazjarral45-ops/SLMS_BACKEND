const express = require('express');
const { getNotifications, getUnreadNotifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.get('/count', unreadCount);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.patch('/:id/unread', markAsUnread);
router.delete('/:id', deleteNotification);

module.exports = router;
