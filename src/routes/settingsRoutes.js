const express = require('express');
const { getSettings, updateNotifications, updateAiSettings } = require('../controllers/settingsController');

const router = express.Router();

router.get('/', getSettings);
router.put('/notifications', updateNotifications);
router.put('/ai', updateAiSettings);

module.exports = router;
