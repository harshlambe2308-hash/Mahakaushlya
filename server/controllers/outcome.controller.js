'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { OUTCOME_STATUSES, isNonEmptyString } = require('../utils/validators');
const outcomeRepository = require('../data/outcomeRepository');
const traineeRepository = require('../data/traineeRepository');

/**
 * POST /api/trainee/outcomes/submit
 * Records a new placement outcome submission for the authenticated trainee
 * (employed / self-employed / higher studies / unemployed).
 */
const submitOutcome = asyncHandler(async (req, res) => {
  const { traineeId } = req.user;
  if (!traineeId) {
    throw ApiError.notFound('No trainee profile is linked to this account.');
  }

  const trainee = await traineeRepository.findById(traineeId);
  if (!trainee) {
    throw ApiError.notFound('Trainee profile not found.');
  }

  const {
    status,
    employmentStatus,
    outcomeType,
    employerName,
    designation,
    monthlySalary,
    monthlyWage,
    monthlyRevenue,
    joiningDate,
    dateOfJoining,
    workLocation,
    proofDocumentUrl,
    remarks,
  } = req.body || {};

  // The frontend outcome form may send `employmentStatus` (employed/self/...)
  // or `status`; `monthlyWage`/`monthlyRevenue` alias `monthlySalary`;
  // `dateOfJoining` aliases `joiningDate`.
  const effectiveStatus =
    OUTCOME_STATUSES.includes(status) || OUTCOME_STATUSES.includes(employmentStatus)
      ? status || employmentStatus
      : null;

  const errors = [];
  if (!isNonEmptyString(effectiveStatus) || !OUTCOME_STATUSES.includes(effectiveStatus)) {
    errors.push({
      field: 'status',
      message: `Status must be one of: ${OUTCOME_STATUSES.join(', ')}.`,
    });
  }

  const salary =
    monthlySalary !== undefined && monthlySalary !== null
      ? Number(monthlySalary)
      : monthlyWage !== undefined && monthlyWage !== null
        ? Number(monthlyWage)
        : monthlyRevenue !== undefined && monthlyRevenue !== null
          ? Number(monthlyRevenue)
          : null;

  if (salary !== null && Number.isNaN(salary)) {
    errors.push({ field: 'monthlySalary', message: 'Monthly salary must be a number.' });
  }

  if (errors.length) {
    throw ApiError.badRequest('Please correct the highlighted fields.', errors);
  }

  const outcome = await outcomeRepository.create({
    traineeId,
    status: effectiveStatus,
    outcomeType,
    employerName,
    designation,
    monthlySalary: Number.isNaN(salary) ? null : salary,
    joiningDate: joiningDate || dateOfJoining || null,
    workLocation,
    proofDocumentUrl,
    remarks,
  });

  return ApiResponse.created(res, outcome, 'Outcome submitted successfully and is pending verification.');
});

/**
 * GET /api/trainee/outcomes/history
 * Returns the full outcome submission history for the authenticated trainee,
 * newest first.
 */
const getOutcomeHistory = asyncHandler(async (req, res) => {
  const { traineeId } = req.user;
  if (!traineeId) {
    throw ApiError.notFound('No trainee profile is linked to this account.');
  }

  const history = await outcomeRepository.findByTraineeId(traineeId);

  return ApiResponse.ok(res, { history, count: history.length }, 'Outcome history fetched successfully.');
});

module.exports = { submitOutcome, getOutcomeHistory };
