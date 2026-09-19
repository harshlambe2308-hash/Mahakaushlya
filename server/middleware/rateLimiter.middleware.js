'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * General API limiter — applied to all /api routes.
 */
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many requests from this IP. Please try again later.',
  },
});

/**
 * Strict limiter applied specifically to login/register on BOTH portals
 * (trainee auth routes and admin auth routes) to slow brute-force attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

module.exports = { apiLimiter, authLimiter };
