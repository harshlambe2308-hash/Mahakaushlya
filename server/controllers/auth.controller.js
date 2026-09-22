'use strict';

const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { signToken } = require('../utils/jwt');
const {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isNonEmptyString,
} = require('../utils/validators');
const userRepository = require('../data/userRepository');
const traineeRepository = require('../data/traineeRepository');

const SALT_ROUNDS = 10;

/**
 * Shared register logic for BOTH portals.
 * - /api/trainee/auth/register always creates role='trainee' (+ trainee profile)
 * - /api/admin/auth/register creates role='admin' (no trainee profile)
 *
 * The trainee portal originally registered by email/phone; the government
 * portal's register accepted a PRN. Decision: registration is email+password
 * based; a PRN (MK-YYYY-MH-NNNNN) is auto-generated per trainee and returned.
 */
const registerTrainee = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    dob,
    gender,
    address,
    district,
    batchName,
    batchId,
    trade,
    courseName,
    trainingCenter,
    trainingPartner,
    completionMonth,
    completionYear,
  } = req.body || {};

  const errors = [];
  if (!isNonEmptyString(fullName)) errors.push({ field: 'fullName', message: 'Full name is required.' });
  if (!isValidEmail(email)) errors.push({ field: 'email', message: 'A valid email is required.' });
  if (!isValidPhone(phone)) errors.push({ field: 'phone', message: 'A valid 10-digit mobile number is required.' });
  if (!isValidPassword(password)) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long.' });
  }

  if (errors.length) {
    throw ApiError.badRequest('Please correct the highlighted fields.', errors);
  }

  const existingByEmail = await userRepository.findByEmail(email);
  if (existingByEmail) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const existingByPhone = await userRepository.findByPhone(phone);
  if (existingByPhone) {
    throw ApiError.conflict('An account with this phone number already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await userRepository.create({
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    passwordHash,
    role: 'trainee',
  });

  const trainee = await traineeRepository.create({
    userId: user.id,
    fullName: fullName.trim(),
    email: user.email,
    phone: user.phone,
    dob,
    gender,
    address,
    district,
    batchName: batchName || (batchId ? `Batch ${batchId}` : null),
    trade,
    courseName,
    trainingCenter,
    trainingPartner,
    completionMonth,
    completionYear,
    completionStatus: 'completed',
  });

  // Link the trainee profile back onto the user record.
  await userRepository.linkTrainee(user.id, trainee.id);

  const token = signToken({ userId: user.id, role: 'trainee', traineeId: trainee.id });

  return ApiResponse.created(
    res,
    {
      token,
      user: { id: user.id, email: user.email, phone: user.phone, role: 'trainee' },
      trainee,
      traineeId: trainee.id,
      prn: trainee.prn,
    },
    'Registration successful. Welcome to MahaKaushalya!'
  );
});

/**
 * Shared login logic for BOTH portals (email + password).
 * Envelope: { token, user: { id, email, role, ... } }
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    throw ApiError.badRequest('Email and password are required.');
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash || user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const traineeId = user.trainee_id || user.traineeId || null;
  const token = signToken({ userId: user.id, role: user.role, traineeId });

  return ApiResponse.ok(
    res,
    {
      token,
      user: { id: user.id, email: user.email, phone: user.phone, role: user.role },
    },
    'Login successful.'
  );
});

/**
 * POST /api/admin/auth/whoami  (public, rate-limited)
 * Used by the unified login page: identifies the portal an email belongs to
 * BEFORE the user types a password. Deliberately minimal and anonymous —
 * returns { portal: 'trainee' | 'officer' } only, never confirming account
 * existence for unknown emails (they are reported as 'unknown', and the
 * unified page falls back to the trainee tab).
 */
const whoami = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!isValidEmail(email)) {
    throw ApiError.badRequest('A valid email is required.');
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    return ApiResponse.ok(res, { portal: 'unknown' }, 'No portal mapping for this email.');
  }

  const OFFICER_ROLES = ['admin', 'government', 'officer', 'analyst'];
  const portal = OFFICER_ROLES.includes(user.role) ? 'officer' : 'trainee';
  return ApiResponse.ok(res, { portal }, 'Portal identified.');
});

module.exports = { registerTrainee, login, whoami };
