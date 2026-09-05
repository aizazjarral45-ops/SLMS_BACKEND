const express = require('express');
const { getProfile, updateProfile, listUsers, deleteUser, deleteOwnAccount, getNotifications, markNotificationRead } = require('../controllers/userController');
const { getPreferences, updatePreferences } = require('../controllers/preferenceController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);
router.delete('/me', authenticate, deleteOwnAccount);
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/:id/read', authenticate, markNotificationRead);
router.get('/me/preferences', authenticate, getPreferences);
router.put('/me/preferences', authenticate, updatePreferences);
router.get('/', authenticate, authorize('admin', 'super_admin'), listUsers);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteUser);

module.exports = router;
