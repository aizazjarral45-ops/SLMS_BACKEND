const express = require('express');
const { listAssignments, createAssignment, updateAssignment, deleteAssignment } = require('../controllers/assignmentController');
const { authorize } = require('../middleware/authorize');
const router = express.Router();
router.get('/', listAssignments);
router.post('/', authorize('student'), createAssignment);
router.put('/:id', authorize('student', 'admin', 'super_admin'), updateAssignment);
router.delete('/:id', authorize('student', 'admin', 'super_admin'), deleteAssignment);
module.exports = router;
