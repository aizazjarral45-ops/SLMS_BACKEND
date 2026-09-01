const express = require('express');
const { listComplaints, createComplaint, updateComplaintStatus, getComplaintStatusHistory } = require('../controllers/complaintController');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', listComplaints);
router.post('/', authorize('student'), createComplaint);
router.patch('/:id/status', authorize('admin', 'super_admin'), updateComplaintStatus);
router.get('/:id/status-history', getComplaintStatusHistory);

module.exports = router;
