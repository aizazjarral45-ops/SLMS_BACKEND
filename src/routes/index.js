const express = require('express');
const authRoutes = require('./authRoutes');
const adminAuthRoutes = require('./adminAuthRoutes');
const userRoutes = require('./userRoutes');
const studentRoutes = require('./studentRoutes');
const adminRoutes = require('./adminRoutes');
const complaintRoutes = require('./complaintRoutes');
const requestRoutes = require('./requestRoutes');
const hostelRoutes = require('./hostelRoutes');
const expenseRoutes = require('./expenseRoutes');
const notificationRoutes = require('./notificationRoutes');
const reminderRoutes = require('./reminderRoutes');
const fileRoutes = require('./fileRoutes');
const academicRoutes = require('./academicRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const feeRoutes = require('./feeRoutes');
const sessionRoutes = require('./sessionRoutes');
const aiRoutes = require('./aiRoutes');
const messageRoutes = require('./messageRoutes');
const commentRoutes = require('./commentRoutes');
const statusHistoryRoutes = require('./statusHistoryRoutes');
const settingsRoutes = require('./settingsRoutes');
const applicationRoutes = require('./applicationRoutes');
const authenticate = require('../middleware/auth');
const { errorResponse } = require('../utils/apiResponse');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminAuthRoutes);
router.use('/users', authenticate, userRoutes);
router.use('/students', authenticate, studentRoutes);
router.use('/admin', authenticate, adminRoutes);
router.use('/complaints', authenticate, complaintRoutes);
router.use('/requests', authenticate, requestRoutes);
router.use('/hostel', authenticate, hostelRoutes);
router.use('/expenses', authenticate, expenseRoutes);
router.use('/notifications', authenticate, notificationRoutes);
router.use('/reminders', authenticate, reminderRoutes);
router.use('/files', authenticate, fileRoutes);
router.use('/academic', authenticate, academicRoutes);
router.use('/assignments', authenticate, assignmentRoutes);
router.use('/fees', authenticate, feeRoutes);
router.use('/applications', authenticate, applicationRoutes);
router.use('/sessions', authenticate, sessionRoutes);
router.use('/messages', authenticate, messageRoutes);
router.use('/comments', authenticate, commentRoutes);
router.use('/status-history', authenticate, statusHistoryRoutes);
router.use('/ai', authenticate, aiRoutes);
router.use('/settings', authenticate, settingsRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'SLMS API is healthy', data: { status: 'ok' } });
});

router.use((_req, res) => {
  return errorResponse(res, 'API endpoint not found', null, 404);
});

module.exports = router;
