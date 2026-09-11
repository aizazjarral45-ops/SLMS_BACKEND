const AIConversation = require("../models/AIConversation");
const {
  createChatConversation,
  generateAIReply,
} = require("../services/aiService");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { isValidObjectId } = require("../utils/objectId");

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
  if (!isValidObjectId(req.params.id))
    return errorResponse(res, "Conversation not found", null, 404);
  const conversation = await AIConversation.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!conversation)
    return errorResponse(res, "Conversation not found", null, 404);
  return successResponse(res, "Conversation", { conversation }, 200);
});

const sendMessage = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return errorResponse(res, "Conversation not found", null, 404);
  const conversation = await AIConversation.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!conversation)
    return errorResponse(res, "Conversation not found", null, 404);

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return errorResponse(res, "A message is required", null, 400);
  const userMessage = { role: "user", content: message };
  if (!conversation.messages.length && conversation.title === "New conversation") {
    conversation.title = message.slice(0, 40);
  }
  conversation.messages.push(userMessage);
  await conversation.save();

  let replyText;
  try {
    replyText = await generateAIReply(conversation);
  } catch (error) {
    conversation.messages.pop();
    await conversation.save();
    console.error("Failed to generate AI reply:", error);
    const status = error.code === "GEMINI_NOT_CONFIGURED" ? 503 : 502;
    return errorResponse(res, status === 503 ? "AI provider is not configured" : "AI provider request failed", null, status);
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
  if (!isValidObjectId(req.params.id)) {
    return errorResponse(res, "Conversation not found", null, 404);
  }

  const conversation = await AIConversation.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!conversation) {
    return errorResponse(res, "Conversation not found", null, 404);
  }

  // "Undo" removes one complete user/assistant turn, while clear-all remains
  // the explicit operation that deletes every conversation.
  if (conversation.messages.length) {
    conversation.messages.pop();
    if (conversation.messages.at(-1)?.role === "user") conversation.messages.pop();
    await conversation.save();
  }
  return successResponse(res, "Last AI prompt undone", { conversation }, 200);
});

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  sendMessage,
  clearHistory,
  deleteHistoryItem,
};
