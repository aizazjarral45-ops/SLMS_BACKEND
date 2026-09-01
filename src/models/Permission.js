const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'general' },
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
