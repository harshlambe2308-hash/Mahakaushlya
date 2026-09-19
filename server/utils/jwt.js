'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Sign a new JWT for an authenticated user/trainee.
 * @param {object} payload e.g. { userId, traineeId, role }
 * @returns {string} signed JWT
 */
function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

/**
 * Verify a JWT and return its decoded payload.
 * Throws (jsonwebtoken's) error on failure — callers should catch it.
 * @param {string} token
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
