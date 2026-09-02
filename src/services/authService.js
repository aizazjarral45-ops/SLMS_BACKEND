const jwt = require('jsonwebtoken');

function signToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

module.exports = { signToken };
