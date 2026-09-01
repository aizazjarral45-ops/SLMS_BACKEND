const express = require('express');
const { register, login, logout, refreshToken, me, changePassword, forgotPassword, resetPassword, verifyResetToken, getLoginHistory } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/password-reset/request', forgotPassword);
router.post('/password-reset/verify', verifyResetToken);
router.post('/password-reset/confirm', resetPassword);
router.get('/login-history', authenticate, getLoginHistory);

module.exports = router;
