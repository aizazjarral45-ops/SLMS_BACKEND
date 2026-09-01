const express = require('express');
const { getStudentDashboard, getStudentProfile, updateStudentProfile, listStudents, getStudentById } = require('../controllers/studentController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/dashboard', authenticate, authorize('student'), getStudentDashboard);
router.get('/profile', authenticate, authorize('student', 'admin', 'super_admin'), getStudentProfile);
router.put('/profile', authenticate, authorize('student', 'admin', 'super_admin'), updateStudentProfile);
router.get('/list', authenticate, authorize('admin', 'super_admin'), listStudents);
router.get('/:id', authenticate, authorize('admin', 'super_admin'), getStudentById);

module.exports = router;
