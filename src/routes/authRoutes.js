const express = require('express');
const { startEmailVerification, verifyEmail, resendEmailVerification, login, logout, refreshToken, me, changePassword, requestAccountDeletion, confirmAccountDeletion, forgotPassword, resetPassword, verifyResetToken, getLoginHistory } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/register', startEmailVerification);
router.post('/register/start-verification', startEmailVerification);
router.post('/register/verify-email', verifyEmail);
router.post('/register/resend-verification', resendEmailVerification);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.post('/delete-account/request', authenticate, requestAccountDeletion);
router.post('/delete-account/resend', authenticate, requestAccountDeletion);
router.post('/delete-account/confirm', authenticate, confirmAccountDeletion);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyResetToken);
router.post('/reset-password', resetPassword);
router.post('/password-reset/request', forgotPassword);
router.post('/password-reset/verify', verifyResetToken);
router.post('/password-reset/confirm', resetPassword);
router.get('/login/history', authenticate, getLoginHistory);
router.get('/login-history', authenticate, getLoginHistory);

module.exports = router;
