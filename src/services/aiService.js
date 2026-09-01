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
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
    messages: [],
  });
}

async function generateAIReply(conversation) {
  const ai = getGeminiClient();
  const contents = conversation.messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : message.role,
    parts: [{ text: message.content }],
  }));
  const response = await ai.models.generateContent({
    model: conversation.model || 'gemini-1.5-flash',
    contents,
  });
  const reply = response.text?.trim();
  if (!reply) throw new Error('Gemini returned an empty response.');
  return reply;
}

module.exports = { createChatConversation, generateAIReply };
