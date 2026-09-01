const express = require('express');
const { listApplications, createApplication, updateApplication } = require('../controllers/applicationController');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', listApplications);
router.post('/', authorize('student'), createApplication);
router.put('/:id', updateApplication);

module.exports = router;
