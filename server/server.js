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
// Static frontend (production / hosting): serve both portals + shared module
// from ../client and ../shared so ONE Railway service hosts API + UI.
// Locally you can still use `npm run preview` (preview-server.js, port 5500).
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');

const CLIENT_DIR = path.join(__dirname, '..', 'client');
const SHARED_DIR = path.join(__dirname, '..', 'shared');

if (fs.existsSync(CLIENT_DIR)) {
  app.use(
    express.static(CLIENT_DIR, {
      index: false,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'no-store');
      },
    })
  );
  // Portals' ES modules resolve ../../shared/auth.js -> /shared/auth.js when
  // served at /trainee-portal/* or /admin-portal/* (no /client prefix).
  app.use('/shared', express.static(SHARED_DIR));
  // Legacy /client/* prefix (matches local preview URLs): expose shared there
  // too so ../../shared/auth.js still resolves under that layout.
  app.use('/client/shared', express.static(SHARED_DIR));

  // Launcher page for the site root (kept in client/index.html so it also
  // works on any static host of the client folder).
  app.get('/', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
  });

  // /client/* prefix (matches local preview URLs) -> same static files
  app.use('/client', express.static(CLIENT_DIR, { index: false }));
}

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
