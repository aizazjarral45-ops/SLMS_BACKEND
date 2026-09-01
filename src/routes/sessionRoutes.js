const express = require('express');
const { listSessions, revokeSession } = require('../controllers/sessionController');

const router = express.Router();

router.get('/', listSessions);
router.patch('/:id/revoke', revokeSession);

module.exports = router;
