const AIConversation = require('../models/AIConversation');
const { GoogleGenAI } = require('@google/genai');

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Gemini is not configured. Set API_KEY in the backend environment.');
  }
  return new GoogleGenAI({ apiKey });
};

async function createChatConversation(userId, title = 'New conversation') {
  return AIConversation.create({
    userId,
    title,
    provider: 'gemini',
    model: process.env.AI_MODEL?.trim() || 'gemini-3.5-flash-lite',
    messages: [],
  });
}

async function generateAIReply(conversation) {
  const ai = getGeminiClient();
  const model = process.env.AI_MODEL?.trim();
  if (!model) {
    throw new Error('Gemini is not configured. Set AI_MODEL in the backend environment.');
  }

  if (conversation.model !== model) {
    conversation.model = model;
    await conversation.save();
  }

  const contents = conversation.messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : message.role,
    parts: [{ text: message.content }],
  }));
  const response = await ai.models.generateContent({
    model,
    contents,
  });
  const reply = response.text?.trim();
  if (!reply) throw new Error('Gemini returned an empty response.');
  return reply;
}

module.exports = { createChatConversation, generateAIReply };
