'use strict';

/**
 * MahaKaushalya — MERGED backend (single Express app, single port).
 *
 * One entry file, one Supabase client (db/supabaseClient.js), one JWT auth
 * middleware, one .env. Trainee routes live at /api/trainee/*, Government/
 * Admin routes at /api/admin/*.
 */

const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const traineeRoutes = require('./routes/trainee');
const adminRoutes = require('./routes/admin');

const app = express();

// ---------------------------------------------------------------------------
// CORS — configured explicitly for the frontend's actual origins.
// Set CORS_ORIGIN in .env as a comma-separated list (never '*' in production).
// ---------------------------------------------------------------------------
const allowedOrigins =
  env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health check (useful for uptime monitors / load balancers)
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', dataProvider: env.DATA_PROVIDER, environment: env.NODE_ENV },
    message: 'MahaKaushalya merged backend is healthy.',
  });
});

// ---------------------------------------------------------------------------
// API routes — ONE server, TWO portals
// ---------------------------------------------------------------------------
app.use('/api/trainee', apiLimiter, traineeRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// ---------------------------------------------------------------------------
// 404 + centralized error handling (must be registered last)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MahaKaushalya merged backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  // eslint-disable-next-line no-console
  console.log(`Data provider: ${env.DATA_PROVIDER}`);
});

module.exports = app;
