const express = require('express');
const { listComments, addComment, deleteComment } = require('../controllers/commentController');

const router = express.Router();

router.get('/:type/:id', listComments);
router.post('/:type/:id', addComment);
router.delete('/:type/:id/comments/:commentId', deleteComment);

module.exports = router;
