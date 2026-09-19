'use strict';

/**
 * Shared JWT authentication + role authorization middleware.
 *
 * - authenticate: verifies the `Authorization: Bearer <token>` header, checks
 *   the user still exists, and attaches `req.user = { userId, email, role,
 *   traineeId }`.
 * - authorize(...roles): restricts the route to the given roles. Used so that
 *   trainee routes reject admin tokens and admin routes reject trainee tokens.
 */

const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const userRepository = require('../data/userRepository');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Authentication token missing. Please log in again.');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired authentication token.');
  }

  const user = await userRepository.findById(decoded.userId);
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists.');
  }

  req.user = {
    userId: user.id,
    email: user.email,
    role: user.role,
    traineeId: user.trainee_id || user.traineeId || null,
  };

  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action.'));
  }
  return next();
};

module.exports = { authenticate, authorize };
