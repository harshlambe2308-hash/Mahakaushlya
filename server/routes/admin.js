'use strict';

/**
 * Government/Admin portal routes — mounted at /api/admin
 * All routes require a JWT with an officer-side role (admin | government |
 * officer | analyst — all four exist in schema.sql's user_role enum).
 * Trainee tokens are REJECTED here via authorize().
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { login } = require('../controllers/auth.controller');
const { exportTraineesCsv, exportOutcomesCsv } = require('../controllers/export.controller');
const {
  getDashboard,
  getOverview,
  listTrainees,
  getTrainee,
  listOutcomes,
  verifyOutcome,
  batchVerifyOutcomes,
  getAnalytics,
  listFollowups,
  createFollowup,
  listNonResponders,
  triggerCampaign,
} = require('../controllers/admin.controller');
const env = require('../config/env');
const { seedAdmin } = require('../controllers/dev.controller');

const router = express.Router();

// --- Auth (public, strictly rate-limited) ---
router.post('/auth/login', authLimiter, login);

// Public, pre-auth endpoint for the unified login page: given an email it
// reports which portal this account belongs to (trainee vs officer side),
// WITHOUT confirming whether the account exists or any other detail.
router.post('/auth/whoami', authLimiter, require('../controllers/auth.controller').whoami);

// Dev-only helper (disabled in production): create the first admin user.
if (env.NODE_ENV !== 'production') {
  router.post('/dev/seed-admin', seedAdmin);
}

// --- Everything below requires an OFFICER-SIDE token ---
router.use(authenticate, authorize('admin', 'government', 'officer', 'analyst'));

router.get('/dashboard', getDashboard);
router.get('/overview', getOverview);
router.get('/trainees', listTrainees);
router.get('/trainees/:traineeId', getTrainee);
router.get('/outcomes', listOutcomes);
router.put('/outcomes/:outcomeId/verify', verifyOutcome);
router.post('/outcomes/batch-verify', batchVerifyOutcomes);
router.get('/analytics', getAnalytics);
router.get('/export/trainees.csv', exportTraineesCsv);
router.get('/export/outcomes.csv', exportOutcomesCsv);
router.get('/followups', listFollowups);
router.post('/followups', createFollowup);
router.get('/queue/non-responders', listNonResponders);
router.post('/queue/trigger-campaign', triggerCampaign);

module.exports = router;
