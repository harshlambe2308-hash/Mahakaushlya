'use strict';

const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { isNonEmptyString, isValidEmail, isValidPassword, FOLLOWUP_CHANNELS } = require('../utils/validators');
const followupRepository = require('../data/followupRepository');
const userRepository = require('../data/userRepository');

const SALT_ROUNDS = 10;

/**
 * POST /api/dev/followups/seed
 * Development/demo helper: creates a pending follow-up prompt for the
 * authenticated trainee so that POST /api/trainee/followups/respond can be
 * exercised end-to-end without a real SMS/WhatsApp gateway or cron job.
 * Disabled automatically in production (see routes/admin.js dev section).
 */
const seedFollowup = asyncHandler(async (req, res) => {
  const { traineeId } = req.user;
  if (!traineeId) {
    throw ApiError.notFound('No trainee profile is linked to this account.');
  }

  const { question, channel, outcomeId } = req.body || {};
  const finalQuestion = isNonEmptyString(question)
    ? question
    : 'Are you still employed at your reported organization?';
  const finalChannel = FOLLOWUP_CHANNELS.includes(channel) ? channel : 'sms';

  const followup = await followupRepository.create({
    traineeId,
    outcomeId: outcomeId || null,
    channel: finalChannel,
    question: finalQuestion,
  });

  return ApiResponse.created(res, followup, 'Follow-up prompt seeded successfully (dev only).');
});

/**
 * POST /api/dev/seed-admin
 * Development/demo helper: creates an admin user so the admin dashboard can
 * be tested end-to-end without manual database manipulation.
 * Disabled automatically in production.
 */
const seedAdmin = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body || {};

  if (!isValidEmail(email)) {
    throw ApiError.badRequest('A valid email is required.');
  }
  if (!isValidPassword(password)) {
    throw ApiError.badRequest('Password must be at least 6 characters long.');
  }

  const validRoles = ['admin', 'government'];
  const finalRole = validRoles.includes(role) ? role : 'admin';

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await userRepository.create({
    email: email.trim().toLowerCase(),
    phone: null,
    passwordHash,
    role: finalRole,
  });

  return ApiResponse.created(
    res,
    { id: user.id, email: user.email, role: user.role },
    `${finalRole.charAt(0).toUpperCase() + finalRole.slice(1)} user seeded successfully (dev only).`
  );
});

module.exports = { seedFollowup, seedAdmin };
