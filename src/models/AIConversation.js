const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], default: 'user' },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const aiConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New conversation' },
  provider: { type: String, default: 'gemini' },
  model: { type: String, default: 'gemini-1.5-flash' },
  archived: { type: Boolean, default: false },
  messages: [aiMessageSchema],
}, { timestamps: true });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
