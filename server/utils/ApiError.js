'use strict';

/**
 * ApiError — operational (expected) error used across the MahaKaushalya backend.
 * Controllers throw `ApiError` instances; the centralized error middleware
 * converts them into the unified JSON envelope:
 *   { success: false, data: null, message: "...", errors: [...]? }
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code (e.g. 400, 401, 404)
   * @param {string} message    Human readable, client-safe message
   * @param {Array}  [errors]   Optional field-level validation errors
   */
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Unprocessable entity', errors) {
    return new ApiError(422, message, errors);
  }

  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
