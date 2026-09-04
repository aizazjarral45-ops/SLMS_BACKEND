const express = require('express');
const {
  listConversations,
  createConversation,
  getConversation,
  sendMessage,
  clearHistory,
  deleteHistoryItem,
} = require('../controllers/aiController');

const router = express.Router();

router.delete('/history', clearHistory);
router.post('/history/:id/undo', deleteHistoryItem);
router.delete('/history/:id', deleteHistoryItem);
router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.post('/conversations/:id/message', sendMessage);

module.exports = router;
