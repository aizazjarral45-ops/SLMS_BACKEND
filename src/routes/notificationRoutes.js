const express = require('express');
const { getNotifications, getUnreadNotifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.get('/count', unreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
