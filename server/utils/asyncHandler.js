'use strict';

/**
 * Wraps an async Express route/controller handler so that any rejected
 * promise is forwarded to `next()`, letting the centralized error middleware
 * handle it — avoids repetitive try/catch blocks.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
