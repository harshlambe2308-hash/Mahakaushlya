'use strict';

const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * 404 handler — reached when no route matched the request.
 */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized error-handling middleware. Converts any thrown/forwarded error
 * (ApiError or otherwise) into the unified response envelope:
 *   { success: false, data: null, message: string, errors?: [...] }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let { statusCode, message } = err;

  if (!statusCode) {
    statusCode = 500;
    message = message || 'Internal server error';
  }

  // Common library-thrown errors that aren't ApiError instances
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON in request body.';
  }

  if (env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.stack || err.message);
  }

  const payload = {
    success: false,
    data: null,
    message: message || 'Something went wrong',
  };

  if (err.errors) {
    payload.errors = err.errors;
  }

  if (env.NODE_ENV === 'development' && statusCode === 500) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
