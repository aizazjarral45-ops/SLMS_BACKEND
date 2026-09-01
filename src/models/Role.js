const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true, required: true },
  description: { type: String, default: '' },
  permissions: [{ type: String }],
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
