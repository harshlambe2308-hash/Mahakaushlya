'use strict';

/**
 * Trainee portal routes — mounted at /api/trainee
 * All routes below /auth are public (rate-limited); everything else requires
 * a JWT with role='trainee'. Admin tokens are REJECTED here via authorize().
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { registerTrainee, login } = require('../controllers/auth.controller');
const { getDashboard, updateProfile } = require('../controllers/trainee.controller');
const { submitOutcome, getOutcomeHistory } = require('../controllers/outcome.controller');
const { respondToFollowup } = require('../controllers/followup.controller');
const env = require('../config/env');
const { seedFollowup } = require('../controllers/dev.controller');

const router = express.Router();

// --- Auth (public, strictly rate-limited) ---
router.post('/auth/register', authLimiter, registerTrainee);
router.post('/auth/login', authLimiter, login);

// --- Everything below requires a TRAINEE token ---
router.use(authenticate, authorize('trainee'));

router.get('/dashboard', getDashboard);
router.put('/profile', updateProfile);
router.post('/outcomes/submit', submitOutcome);
router.get('/outcomes/history', getOutcomeHistory);
router.post('/followups/respond', respondToFollowup);

// Dev-only helper (disabled in production): seed a pending follow-up so the
// respond flow can be tested without an SMS/WhatsApp gateway.
if (env.NODE_ENV !== 'production') {
  router.post('/dev/followups/seed', seedFollowup);
}

module.exports = router;
