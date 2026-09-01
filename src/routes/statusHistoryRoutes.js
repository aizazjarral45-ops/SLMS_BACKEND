const express = require('express');
const { listStatusHistory } = require('../controllers/statusHistoryController');
const { authorize } = require('../middleware/authorize');
const router = express.Router();
router.get('/', authorize('admin', 'super_admin'), listStatusHistory);
module.exports = router;
