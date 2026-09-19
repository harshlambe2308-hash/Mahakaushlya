'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { isNonEmptyString, isValidEmail, isValidPhone } = require('../utils/validators');
const traineeRepository = require('../data/traineeRepository');
const outcomeRepository = require('../data/outcomeRepository');
const followupRepository = require('../data/followupRepository');

/**
 * GET /api/trainee/dashboard
 * Returns the trainee's profile, latest outcome, outcome history summary,
 * and any pending follow-up prompts.
 */
const getDashboard = asyncHandler(async (req, res) => {
  const { traineeId } = req.user;
  if (!traineeId) {
    throw ApiError.notFound('No trainee profile is linked to this account.');
  }

  const trainee = await traineeRepository.findById(traineeId);
  if (!trainee) {
    throw ApiError.notFound('Trainee profile not found.');
  }

  const [history, latestOutcome, pendingFollowups] = await Promise.all([
    outcomeRepository.findByTraineeId(traineeId),
    outcomeRepository.findLatestByTraineeId(traineeId),
    followupRepository.findPendingByTraineeId(traineeId),
  ]);

  return ApiResponse.ok(
    res,
    {
      trainee,
      latestOutcome,
      outcomeCount: history.length,
      pendingFollowups,
    },
    'Dashboard data fetched successfully.'
  );
});

/**
 * PUT /api/trainee/profile
 * Allows a trainee to update their own editable profile fields.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { traineeId } = req.user;
  if (!traineeId) {
    throw ApiError.notFound('No trainee profile is linked to this account.');
  }

  const existing = await traineeRepository.findById(traineeId);
  if (!existing) {
    throw ApiError.notFound('Trainee profile not found.');
  }

  const { fullName, email, phone, dob, gender, address, district, profilePhotoUrl } = req.body || {};

  const errors = [];
  if (fullName !== undefined && !isNonEmptyString(fullName)) {
    errors.push({ field: 'fullName', message: 'Full name cannot be empty.' });
  }
  if (email !== undefined && !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'A valid email is required.' });
  }
  if (phone !== undefined && !isValidPhone(phone)) {
    errors.push({ field: 'phone', message: 'A valid 10-digit mobile number is required.' });
  }

  if (errors.length) {
    throw ApiError.badRequest('Please correct the highlighted fields.', errors);
  }

  const updates = {};
  if (fullName !== undefined) updates.fullName = fullName.trim();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (phone !== undefined) updates.phone = phone.trim();
  if (dob !== undefined) updates.dob = dob;
  if (gender !== undefined) updates.gender = gender;
  if (address !== undefined) updates.address = address;
  if (district !== undefined) updates.district = district;
  if (profilePhotoUrl !== undefined) updates.profilePhotoUrl = profilePhotoUrl;

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest('No valid fields were provided to update.');
  }

  const updated = await traineeRepository.updateById(traineeId, updates);

  return ApiResponse.ok(res, updated, 'Profile updated successfully.');
});

module.exports = { getDashboard, updateProfile };
