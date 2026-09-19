'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { OUTCOME_STATUSES } = require('../utils/validators');
const traineeRepository = require('../data/traineeRepository');
const outcomeRepository = require('../data/outcomeRepository');
const followupRepository = require('../data/followupRepository');

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard
// Aggregated overview for the Government/Admin landing page.
// ---------------------------------------------------------------------------
const getDashboard = asyncHandler(async (req, res) => {
  const [trainees, outcomes, followups] = await Promise.all([
    traineeRepository.findAll(),
    outcomeRepository.findAll(),
    followupRepository.findAll(),
  ]);

  const totalTrainees = trainees.length;
  const totalOutcomes = outcomes.length;

  const outcomesByStatus = {};
  OUTCOME_STATUSES.forEach((s) => {
    outcomesByStatus[s] = outcomes.filter((o) => o.status === s).length;
  });

  const pendingVerifications = outcomes.filter((o) => o.verificationStatus === 'pending').length;
  const verifiedOutcomes = outcomes.filter((o) => o.verificationStatus === 'verified').length;
  const rejectedOutcomes = outcomes.filter((o) => o.verificationStatus === 'rejected').length;

  const placedCount = outcomes.filter(
    (o) => o.status === 'employed' || o.status === 'self_employed'
  ).length;
  const placementRate = totalOutcomes > 0 ? ((placedCount / totalOutcomes) * 100).toFixed(1) : '0.0';

  const totalFollowups = followups.length;
  const pendingFollowups = followups.filter((f) => f.status === 'pending').length;
  const respondedFollowups = followups.filter((f) => f.status === 'responded').length;

  return ApiResponse.ok(
    res,
    {
      totalTrainees,
      totalOutcomes,
      outcomesByStatus,
      pendingVerifications,
      verifiedOutcomes,
      rejectedOutcomes,
      placementRate: `${placementRate}%`,
      totalFollowups,
      pendingFollowups,
      respondedFollowups,
    },
    'Admin dashboard data fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/overview — same aggregates, keyed for the admin frontend
// overview page (totalEnrolled / reportedPlacements / avgWage / etc.)
// ---------------------------------------------------------------------------
const getOverview = asyncHandler(async (req, res) => {
  const [trainees, outcomes] = await Promise.all([
    traineeRepository.findAll(),
    outcomeRepository.findAll(),
  ]);

  const placed = outcomes.filter(
    (o) => o.status === 'employed' || o.status === 'self_employed'
  );
  const wages = placed
    .map((o) => Number(o.monthlySalary))
    .filter((n) => Number.isFinite(n) && n > 0);

  const distribution = {};
  OUTCOME_STATUSES.forEach((s) => {
    distribution[s] = outcomes.filter((o) => o.status === s).length;
  });

  return ApiResponse.ok(
    res,
    {
      totalEnrolled: trainees.length,
      certifiedTrainees: trainees.length,
      reportedPlacements: placed.length,
      pendingVerifications: outcomes.filter((o) => o.verificationStatus === 'pending').length,
      retentionRate: null,
      avgWage: wages.length
        ? Math.round(wages.reduce((a, b) => a + b, 0) / wages.length)
        : null,
      placementDistribution: OUTCOME_STATUSES.map((s) => ({
        month: s.replace(/_/g, ' '),
        percent: outcomes.length ? Math.round((distribution[s] / outcomes.length) * 100) : 0,
        bars: null,
        statsText: `${distribution[s]} of ${outcomes.length}`,
      })),
    },
    'Admin overview fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/trainees — filterable trainee listing
// ---------------------------------------------------------------------------
const listTrainees = asyncHandler(async (req, res) => {
  const { trade, trainingCenter, batchName, district, search, status } = req.query;
  const filters = {};
  if (trade) filters.trade = trade;
  if (trainingCenter) filters.trainingCenter = trainingCenter;
  if (batchName) filters.batchName = batchName;
  if (district) filters.district = district;
  if (search) filters.search = search;
  if (status && status !== 'all') filters.completionStatus = status;

  let trainees = await traineeRepository.findAll(filters);
  if (filters.completionStatus) {
    trainees = trainees.filter((t) =>
      (t.completionStatus || '').toLowerCase().includes(filters.completionStatus.toLowerCase())
    );
  }

  return ApiResponse.ok(
    res,
    { trainees, count: trainees.length, filters },
    'Trainee list fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/outcomes — filterable outcome listing
// ---------------------------------------------------------------------------
const listOutcomes = asyncHandler(async (req, res) => {
  const { status, verificationStatus, traineeId } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (verificationStatus) filters.verificationStatus = verificationStatus;
  if (traineeId) filters.traineeId = traineeId;

  const outcomes = await outcomeRepository.findAll(filters);

  return ApiResponse.ok(
    res,
    { outcomes, count: outcomes.length, filters },
    'Outcome list fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// PUT /api/admin/outcomes/:outcomeId/verify
// Verify or reject a trainee's submitted outcome.
// Body: { verificationStatus: 'verified' | 'rejected', remarks?: string }
// ---------------------------------------------------------------------------
const verifyOutcome = asyncHandler(async (req, res) => {
  const { outcomeId } = req.params;
  const { verificationStatus, status, remarks } = req.body || {};

  const chosen = verificationStatus || status;
  const VALID_STATUSES = ['verified', 'rejected'];

  if (!chosen || !VALID_STATUSES.includes(String(chosen).toLowerCase())) {
    throw ApiError.badRequest(
      `verificationStatus must be one of: ${VALID_STATUSES.join(', ')}.`
    );
  }
  const finalStatus = String(chosen).toLowerCase();

  const outcome = await outcomeRepository.findById(outcomeId);
  if (!outcome) {
    throw ApiError.notFound('Outcome not found.');
  }

  const currentVerification = outcome.verificationStatus || outcome.verification_status;
  if (currentVerification !== 'pending') {
    throw ApiError.conflict(`This outcome has already been ${currentVerification}.`);
  }

  const updated = await outcomeRepository.updateById(outcomeId, {
    verificationStatus: finalStatus,
    verifiedBy: req.user.userId,
    remarks: remarks || undefined,
  });

  return ApiResponse.ok(res, updated, `Outcome ${finalStatus} successfully.`);
});

// ---------------------------------------------------------------------------
// GET /api/admin/analytics — deep analytics for government reporting
// ---------------------------------------------------------------------------
const getAnalytics = asyncHandler(async (req, res) => {
  const [trainees, outcomes] = await Promise.all([
    traineeRepository.findAll(),
    outcomeRepository.findAll(),
  ]);

  // --- Placement rate by trade ---
  const trades = [...new Set(trainees.map((t) => t.trade || 'Unknown').filter(Boolean))];
  const placementByTrade = trades.map((trade) => {
    const tradeTrainees = trainees.filter((t) => t.trade === trade);
    const tradeTraineeIds = new Set(tradeTrainees.map((t) => t.id));
    const tradeOutcomes = outcomes.filter((o) => tradeTraineeIds.has(o.traineeId || o.trainee_id));
    const placed = tradeOutcomes.filter((o) => o.status === 'employed' || o.status === 'self_employed');
    const rate =
      tradeOutcomes.length > 0 ? ((placed.length / tradeOutcomes.length) * 100).toFixed(1) : '0.0';
    return {
      trade,
      totalTrainees: tradeTrainees.length,
      totalOutcomes: tradeOutcomes.length,
      placed: placed.length,
      placementRate: `${rate}%`,
    };
  });

  // --- Placement rate by training center ---
  const centers = [...new Set(trainees.map((t) => t.trainingCenter || 'Unknown').filter(Boolean))];
  const placementByCenter = centers.map((center) => {
    const centerTrainees = trainees.filter((t) => t.trainingCenter === center);
    const centerTraineeIds = new Set(centerTrainees.map((t) => t.id));
    const centerOutcomes = outcomes.filter((o) => centerTraineeIds.has(o.traineeId || o.trainee_id));
    const placed = centerOutcomes.filter((o) => o.status === 'employed' || o.status === 'self_employed');
    const rate =
      centerOutcomes.length > 0 ? ((placed.length / centerOutcomes.length) * 100).toFixed(1) : '0.0';
    return {
      center,
      totalTrainees: centerTrainees.length,
      totalOutcomes: centerOutcomes.length,
      placed: placed.length,
      placementRate: `${rate}%`,
    };
  });

  // --- Placement rate by training partner ---
  const partners = [...new Set(trainees.map((t) => t.trainingPartner || 'Unknown').filter(Boolean))];
  const placementByPartner = partners.map((partner) => {
    const partnerTrainees = trainees.filter((t) => t.trainingPartner === partner);
    const partnerTraineeIds = new Set(partnerTrainees.map((t) => t.id));
    const partnerOutcomes = outcomes.filter((o) => partnerTraineeIds.has(o.traineeId || o.trainee_id));
    const placed = partnerOutcomes.filter((o) => o.status === 'employed' || o.status === 'self_employed');
    const rate =
      partnerOutcomes.length > 0 ? ((placed.length / partnerOutcomes.length) * 100).toFixed(1) : '0.0';
    return {
      partner,
      totalTrainees: partnerTrainees.length,
      totalOutcomes: partnerOutcomes.length,
      placed: placed.length,
      placementRate: `${rate}%`,
    };
  });

  // --- Salary distribution ---
  const salaries = outcomes
    .filter((o) => (o.status === 'employed' || o.status === 'self_employed') && o.monthlySalary)
    .map((o) => Number(o.monthlySalary));

  const salaryDistribution = {
    count: salaries.length,
    min: salaries.length ? Math.min(...salaries) : 0,
    max: salaries.length ? Math.max(...salaries) : 0,
    average: salaries.length
      ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
      : 0,
    median: salaries.length
      ? (() => {
          const sorted = [...salaries].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0
            ? sorted[mid]
            : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        })()
      : 0,
  };

  // --- Outcome status distribution ---
  const statusDistribution = {};
  OUTCOME_STATUSES.forEach((s) => {
    statusDistribution[s] = outcomes.filter((o) => o.status === s).length;
  });

  return ApiResponse.ok(
    res,
    {
      totalTrainees: trainees.length,
      totalOutcomes: outcomes.length,
      statusDistribution,
      placementByTrade,
      placementByCenter,
      placementByPartner,
      salaryDistribution,
    },
    'Analytics data fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/followups — follow-up listing for admin review
// ---------------------------------------------------------------------------
const listFollowups = asyncHandler(async (req, res) => {
  const { status, traineeId, channel } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (traineeId) filters.traineeId = traineeId;
  if (channel) filters.channel = channel;

  const followups = await followupRepository.findAll(filters);

  return ApiResponse.ok(
    res,
    { followups, count: followups.length, filters },
    'Follow-up list fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/queue/non-responders — pending follow-ups joined with trainee
// info, for the Non-Responder Queue page.
// ---------------------------------------------------------------------------
const listNonResponders = asyncHandler(async (req, res) => {
  const [followups, trainees] = await Promise.all([
    followupRepository.findAll({ status: 'pending' }),
    traineeRepository.findAll(),
  ]);

  const byId = new Map(trainees.map((t) => [t.id, t]));
  const queue = followups.map((f) => {
    const t = byId.get(f.traineeId || f.trainee_id) || {};
    const daysOverdue = Math.max(
      0,
      Math.floor((Date.now() - new Date(f.sentAt || f.sent_at).getTime()) / 86400000)
    );
    return {
      followupId: f.id || f.followupId,
      traineeId: f.traineeId || f.trainee_id,
      uid: t.prn || '—',
      name: t.fullName || t.full_name || 'Unknown trainee',
      phone: t.phone || '—',
      course: t.courseName || t.course_name || t.trade || 'Vocational Trade',
      vtp: t.trainingCenter || t.training_center || '—',
      channel: (f.channel || 'sms').toUpperCase() === 'WHATSAPP' ? 'WhatsApp' : 'SMS',
      stage: '6-Month Retention',
      overdue: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
      attempts: 1,
      question: f.question || null,
    };
  });

  return ApiResponse.ok(
    res,
    queue,
    'Non-responder queue fetched successfully.'
  );
});

module.exports = {
  getDashboard,
  getOverview,
  listTrainees,
  listOutcomes,
  verifyOutcome,
  getAnalytics,
  listFollowups,
  listNonResponders,
};
