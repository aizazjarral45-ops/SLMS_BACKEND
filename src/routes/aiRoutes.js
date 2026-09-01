const express = require('express');
const { listConversations, createConversation, getConversation, sendMessage } = require('../controllers/aiController');

const router = express.Router();

router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.post('/conversations/:id/message', sendMessage);

module.exports = router;
