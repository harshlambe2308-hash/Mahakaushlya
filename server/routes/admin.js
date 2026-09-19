'use strict';

/**
 * Government/Admin portal routes — mounted at /api/admin
 * All routes require a JWT with role='admin' (or 'government'). Trainee
 * tokens are REJECTED here via authorize().
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { login } = require('../controllers/auth.controller');
const {
  getDashboard,
  getOverview,
  listTrainees,
  listOutcomes,
  verifyOutcome,
  getAnalytics,
  listFollowups,
  listNonResponders,
} = require('../controllers/admin.controller');
const env = require('../config/env');
const { seedAdmin } = require('../controllers/dev.controller');

const router = express.Router();

// --- Auth (public, strictly rate-limited) ---
router.post('/auth/login', authLimiter, login);

// Dev-only helper (disabled in production): create the first admin user.
if (env.NODE_ENV !== 'production') {
  router.post('/dev/seed-admin', seedAdmin);
}

// --- Everything below requires an ADMIN/GOVERNMENT token ---
router.use(authenticate, authorize('admin', 'government'));

router.get('/dashboard', getDashboard);
router.get('/overview', getOverview);
router.get('/trainees', listTrainees);
router.get('/outcomes', listOutcomes);
router.put('/outcomes/:outcomeId/verify', verifyOutcome);
router.get('/analytics', getAnalytics);
router.get('/followups', listFollowups);
router.get('/queue/non-responders', listNonResponders);

module.exports = router;
