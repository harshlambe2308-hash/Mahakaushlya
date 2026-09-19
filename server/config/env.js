'use strict';

const dotenv = require('dotenv');

dotenv.config();

/**
 * Centralized, validated environment configuration.
 * Import this module anywhere instead of touching `process.env` directly.
 */
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_only_insecure_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 150,
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,

  DATA_PROVIDER: process.env.DATA_PROVIDER || 'memory',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev_only_insecure_secret_change_me') {
  // eslint-disable-next-line no-console
  console.warn(
    '[WARN] JWT_SECRET is using the insecure default value in production. Set a strong secret via environment variables.'
  );
}

module.exports = env;
