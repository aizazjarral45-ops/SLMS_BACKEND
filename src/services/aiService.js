const AIConversation = require('../models/AIConversation');
const { GoogleGenAI } = require('@google/genai');

const getGeminiConfig = () => {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  const configuredModel = (process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.6-flash').trim();
  const model = configuredModel === 'gemini-2.0-flash'
    ? 'gemini-3.6-flash'
    : configuredModel;
  if (!apiKey) {
    const error = new Error('Gemini is not configured. Set GEMINI_API_KEY in the backend environment.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }
  if (!model) {
    const error = new Error('Gemini is not configured. Set GEMINI_MODEL in the backend environment.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }
  return { apiKey, model };
};

const getGeminiClient = () => {
  const { apiKey } = getGeminiConfig();
  return new GoogleGenAI({ apiKey });
};

async function createChatConversation(userId, title = 'New conversation') {
  return AIConversation.create({
    userId,
    title,
    provider: 'gemini',
    model: getGeminiConfig().model,
    messages: [],
  });
}

async function generateAIReply(conversation) {
  const ai = getGeminiClient();
  const { model } = getGeminiConfig();

  if (conversation.model !== model) {
    conversation.model = model;
    await conversation.save();
  }

  const contents = conversation.messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : message.role,
    parts: [{ text: message.content }],
  }));
  let response;
  try {
    response = await ai.models.generateContent({ model, contents });
  } catch (error) {
    const providerError = new Error('Gemini request failed.');
    providerError.code = 'GEMINI_REQUEST_FAILED';
    providerError.cause = error;
    throw providerError;
  }
  const responseText = typeof response.text === 'string'
    ? response.text
    : typeof response.text === 'function' ? response.text() : '';
  const reply = responseText.trim();
  if (!reply) throw new Error('Gemini returned an empty response.');
  return reply;
}

module.exports = { createChatConversation, generateAIReply };
