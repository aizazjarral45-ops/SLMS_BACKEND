const AIConversation = require("../models/AIConversation");
const mongoose = require("mongoose");
const {
  createChatConversation,
  generateAIReply,
} = require("../services/aiService");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await AIConversation.find({
    userId: req.user._id,
  }).sort({ updatedAt: -1 });
  return successResponse(res, "AI conversations", { conversations }, 200);
});

const createConversation = asyncHandler(async (req, res) => {
  const conversation = await createChatConversation(
    req.user._id,
    req.body.title || "New conversation",
  );
  return successResponse(res, "Conversation created", { conversation }, 201);
});

const getConversation = asyncHandler(async (req, res) => {
  const conversation = await AIConversation.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!conversation)
    return errorResponse(res, "Conversation not found", null, 404);
  return successResponse(res, "Conversation", { conversation }, 200);
});

const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await AIConversation.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!conversation)
    return errorResponse(res, "Conversation not found", null, 404);

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return errorResponse(res, "A message is required", null, 400);
  const userMessage = { role: "user", content: message };
  conversation.messages.push(userMessage);
  await conversation.save();

  let replyText;
  try {
    replyText = await generateAIReply(conversation);
  } catch (error) {
    console.error("Failed to generate AI reply:", error);
    return errorResponse(res, "Failed to generate AI reply", null, 500);
  }
  const assistantMessage = { role: "assistant", content: replyText };
  conversation.messages.push(assistantMessage);
  await conversation.save();

  return successResponse(res, "AI reply generated", { conversation }, 200);
});

const clearHistory = asyncHandler(async (req, res) => {
  const result = await AIConversation.deleteMany({ userId: req.user._id });
  return successResponse(
    res,
    "AI conversation history deleted",
    { deletedCount: result.deletedCount },
    200,
  );
});

const deleteHistoryItem = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return errorResponse(res, "Conversation not found", null, 404);
  }

  const result = await AIConversation.deleteOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!result.deletedCount) {
    return errorResponse(res, "Conversation not found", null, 404);
  }

  return successResponse(res, "AI conversation deleted", null, 200);
});

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  sendMessage,
  clearHistory,
  deleteHistoryItem,
};
