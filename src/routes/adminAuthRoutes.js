const express = require('express');
const { login, logout, changePassword, getLoginHistory } = require('../controllers/adminAuthController');
const authenticateAdmin = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', authenticateAdmin, logout);
router.post('/change-password', authenticateAdmin, changePassword);
router.get('/login-history', authenticateAdmin, getLoginHistory);

module.exports = router;
