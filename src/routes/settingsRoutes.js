const express = require('express');
const { getSettings, updateNotifications, updateAiSettings, getAdminSettings, updateAdminSecurity } = require('../controllers/settingsController');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', getSettings);
router.put('/notifications', updateNotifications);
router.put('/ai', updateAiSettings);
router.get('/admin', authorize('admin', 'super_admin'), getAdminSettings);
router.put('/admin/security', authorize('admin', 'super_admin'), updateAdminSecurity);

module.exports = router;
