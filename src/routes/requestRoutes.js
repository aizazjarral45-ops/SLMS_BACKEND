const express = require('express');
const { listRequests, createRequest, updateRequestStatus, getRequestStatusHistory } = require('../controllers/requestController');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', listRequests);
router.post('/', authorize('student'), createRequest);
router.patch('/:id/status', authorize('admin', 'super_admin'), updateRequestStatus);
router.get('/:id/status-history', getRequestStatusHistory);

module.exports = router;
