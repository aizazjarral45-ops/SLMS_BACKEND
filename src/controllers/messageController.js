const Message = require('../models/Message');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({
    $or: [
      { senderId: req.user._id },
      { receiverId: req.user._id },
    ],
  }).sort({ createdAt: -1 });
  return successResponse(res, 'Messages', { messages }, 200);
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await Message.create({
    senderId: req.user._id,
    receiverId: req.body.receiverId,
    roomId: req.body.roomId || `${req.user._id}:${req.body.receiverId}`,
    content: req.body.content || '',
    attachments: req.body.attachments || [],
  });
  return successResponse(res, 'Message sent', { message }, 201);
});

module.exports = { listMessages, sendMessage };
