const mongoose = require('mongoose');

function isValidObjectId(value) {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

module.exports = { isValidObjectId };
