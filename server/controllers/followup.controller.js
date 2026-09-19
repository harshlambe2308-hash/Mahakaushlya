'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { isNonEmptyString } = require('../utils/validators');
const followupRepository = require('../data/followupRepository');

/**
 * POST /api/trainee/followups/respond
 * Records a trainee's response to a pending SMS/WhatsApp follow-up prompt.
 */
const respondToFollowup = asyncHandler(async (req, res) => {
  const { traineeId } = req.user;
  if (!traineeId) {
    throw ApiError.notFound('No trainee profile is linked to this account.');
  }

  const { followupId, response } = req.body || {};

  if (!isNonEmptyString(followupId)) {
    throw ApiError.badRequest('followupId is required.');
  }
  if (!isNonEmptyString(response)) {
    throw ApiError.badRequest('A response is required.');
  }

  const followup = await followupRepository.findById(followupId);
  if (!followup) {
    throw ApiError.notFound('Follow-up prompt not found.');
  }

  if ((followup.traineeId || followup.trainee_id) !== traineeId) {
    throw ApiError.forbidden('This follow-up prompt does not belong to your account.');
  }

  if (followup.status === 'responded') {
    throw ApiError.conflict('This follow-up has already been responded to.');
  }

  const updated = await followupRepository.recordResponse(followupId, response.trim());

  return ApiResponse.ok(res, updated, 'Thank you! Your response has been recorded.');
});

module.exports = { respondToFollowup };
