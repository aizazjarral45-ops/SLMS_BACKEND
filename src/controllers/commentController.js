const Comment = require('../models/Comment');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ targetType: req.params.type, targetId: req.params.id }).sort({ createdAt: -1 });
  return successResponse(res, 'Comments', { comments }, 200);
});

const addComment = asyncHandler(async (req, res) => {
  const comment = await Comment.create({
    targetType: req.params.type,
    targetId: req.params.id,
    userId: req.user._id,
    text: req.body.text,
  });
  return successResponse(res, 'Comment added', { comment }, 201);
});

const deleteComment = asyncHandler(async (req, res) => {
  const deleted = await Comment.findOneAndDelete({ _id: req.params.commentId, userId: req.user._id });
  if (!deleted) return errorResponse(res, 'Comment not found', null, 404);
  return successResponse(res, 'Comment deleted', {}, 200);
});

module.exports = { listComments, addComment, deleteComment };
