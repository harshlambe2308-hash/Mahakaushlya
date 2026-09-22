'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { OUTCOME_STATUSES, VERIFICATION_STATUSES, FOLLOWUP_CHANNELS, isNonEmptyString } = require('../utils/validators');
const traineeRepository = require('../data/traineeRepository');
const outcomeRepository = require('../data/outcomeRepository');
const followupRepository = require('../data/followupRepository');
const userRepository = require('../data/userRepository');

const OFFICER_ROLES = ['admin', 'government', 'officer', 'analyst'];

/** Normalize a camelCase (memory) or snake_case (supabase) row accessor. */
function field(row, ...names) {
  for (const n of names) {
    if (row && row[n] !== undefined && row[n] !== null) return row[n];
  }
  return null;
}

/** Parse an optional positive-int query param. */
function intParam(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Shape a raw trainee row (either provider) for the admin frontend. */
function shapeTrainee(t) {
  if (!t) return null;
  return {
    id: t.id,
    userId: t.userId || t.user_id || null,
    prn: t.prn,
    fullName: t.fullName || t.full_name || 'Unnamed Trainee',
    email: t.email || null,
    phone: t.phone || null,
    gender: t.gender || null,
    dob: t.dob || null,
    district: t.district || null,
    batchName: t.batchName || t.batch_name || null,
    trade: t.trade || null,
    courseName: t.courseName || t.course_name || null,
    trainingCenter: t.trainingCenter || t.training_center || null,
    trainingPartner: t.trainingPartner || t.training_partner || null,
    completionMonth: t.completionMonth || t.completion_month || null,
    completionYear: t.completionYear || t.completion_year || null,
    completionStatus: t.completionStatus || t.completion_status || null,
    profilePhotoUrl: t.profilePhotoUrl || t.profile_photo_url || null,
    createdAt: t.createdAt || t.created_at || null,
  };
}

/** Shape a raw outcome row (either provider) for the admin frontend. */
function shapeOutcome(o) {
  if (!o) return null;
  return {
    id: o.id,
    traineeId: o.traineeId || o.trainee_id,
    status: o.status,
    outcomeType: o.outcomeType || o.outcome_type || null,
    employerName: o.employerName || o.employer_name || null,
    employerBusinessName: o.employerBusinessName || o.employer_business_name || null,
    designation: o.designation || null,
    monthlySalary: o.monthlySalary || o.monthly_salary || null,
    monthlyIncome: o.monthlyIncome || o.monthly_income || null,
    joiningDate: o.joiningDate || o.joining_date || null,
    workLocation: o.workLocation || o.work_location || null,
    industry: o.industry || null,
    proofDocumentUrl: o.proofDocumentUrl || o.proof_document_url || null,
    remarks: o.remarks || null,
    verificationStatus: o.verificationStatus || o.verification_status || 'pending',
    verifiedBy: o.verifiedBy || o.verified_by || null,
    verifiedAt: o.verifiedAt || o.verified_at || null,
    submittedAt: o.submittedAt || o.submitted_at || o.createdAt || o.created_at || null,
  };
}

/** Shape a raw follow-up row (either provider) for the admin frontend. */
function shapeFollowup(f) {
  if (!f) return null;
  return {
    id: f.id,
    traineeId: f.traineeId || f.trainee_id,
    outcomeId: f.outcomeId || f.outcome_id || null,
    channel: f.channel || 'sms',
    status: f.status,
    question: f.question || null,
    response: f.response || f.response_text || null,
    sentAt: f.sentAt || f.sent_at || null,
    respondedAt: f.respondedAt || f.responded_at || null,
  };
}

/**
 * Attach trainee summary + verifier identity to outcome rows so the register
 * and dossier render without N+1 client calls.
 */
async function enrichOutcomes(outcomes) {
  const trainees = await traineeRepository.findAll({ limit: 1 });
  const byTrainee = new Map(trainees.items.map((t) => [t.id, shapeTrainee(t)]));
  const verifierIds = [...new Set(outcomes.map((o) => field(o, 'verifiedBy', 'verified_by')).filter(Boolean))];
  const verifiers = new Map();
  await Promise.all(
    verifierIds.map(async (uid) => {
      const u = await userRepository.findById(uid);
      if (u) verifiers.set(uid, u.email || uid);
    })
  );

  return outcomes.map((raw) => {
    const o = shapeOutcome(raw);
    const t = byTrainee.get(o.traineeId) || null;
    return {
      ...o,
      trainee: t
        ? {
            id: t.id,
            prn: t.prn,
            fullName: t.fullName,
            district: t.district,
            trade: t.trade,
            trainingCenter: t.trainingCenter,
          }
        : null,
      verifiedByEmail: verifiers.get(o.verifiedBy) || null,
    };
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard
// ---------------------------------------------------------------------------
const getDashboard = asyncHandler(async (req, res) => {
  const [trainees, outcomes, followups] = await Promise.all([
    traineeRepository.findAll({ limit: 1 }),
    outcomeRepository.findAll({ limit: 1 }),
    followupRepository.findAll({ limit: 1 }),
  ]);

  const totalTrainees = trainees.total;
  const totalOutcomes = outcomes.total;
  const items = outcomes.items;
  const followupItems = followups.items;

  const outcomesByStatus = {};
  OUTCOME_STATUSES.forEach((s) => {
    outcomesByStatus[s] = items.filter((o) => (o.status || '').toLowerCase() === s).length;
  });

  const pendingVerifications = items.filter((o) => field(o, 'verificationStatus', 'verification_status') === 'pending').length;
  const verifiedOutcomes = items.filter((o) => field(o, 'verificationStatus', 'verification_status') === 'verified').length;
  const rejectedOutcomes = items.filter((o) => field(o, 'verificationStatus', 'verification_status') === 'rejected').length;

  const placedCount = items.filter((o) => ['employed', 'self_employed'].includes((o.status || '').toLowerCase())).length;
  const placementRate = totalOutcomes > 0 ? ((placedCount / totalOutcomes) * 100).toFixed(1) : '0.0';

  const totalFollowups = followups.total;
  const pendingFollowups = followupItems.filter((f) => f.status === 'pending').length;
  const respondedFollowups = followupItems.filter((f) => f.status === 'responded').length;

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
// GET /api/admin/overview — KPIs shaped for the admin overview page
// ---------------------------------------------------------------------------
const getOverview = asyncHandler(async (req, res) => {
  const [trainees, outcomes] = await Promise.all([
    traineeRepository.findAll({ limit: 1 }),
    outcomeRepository.findAll({ limit: 1 }),
  ]);

  const items = outcomes.items;
  const totalOutcomes = outcomes.total;

  const placed = items.filter((o) => ['employed', 'self_employed'].includes((o.status || '').toLowerCase()));
  const wages = placed
    .map((o) => Number(field(o, 'monthlySalary', 'monthly_salary')))
    .filter((n) => Number.isFinite(n) && n > 0);

  const distribution = {};
  OUTCOME_STATUSES.forEach((s) => {
    distribution[s] = items.filter((o) => (o.status || '').toLowerCase() === s).length;
  });

  return ApiResponse.ok(
    res,
    {
      totalEnrolled: trainees.total,
      certifiedTrainees: trainees.total,
      reportedPlacements: placed.length,
      pendingVerifications: items.filter((o) => field(o, 'verificationStatus', 'verification_status') === 'pending').length,
      retentionRate: null, // TBC — 3/6/12-month cohort windows need a scheduled job (TRD out-of-scope)
      avgWage: wages.length ? Math.round(wages.reduce((a, b) => a + b, 0) / wages.length) : null,
      placementDistribution: OUTCOME_STATUSES.map((s) => ({
        month: s.replace(/_/g, ' '),
        percent: totalOutcomes ? Math.round((distribution[s] / totalOutcomes) * 100) : 0,
        bars: null,
        statsText: `${distribution[s]} of ${totalOutcomes}`,
      })),
    },
    'Admin overview fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/trainees — filterable, paginated, outcome-enriched register
// ---------------------------------------------------------------------------
const listTrainees = asyncHandler(async (req, res) => {
  const { trade, trainingCenter, batchName, district, search, status, page, limit } = req.query;
  const filters = { page, limit };
  if (trade) filters.trade = trade;
  if (trainingCenter) filters.trainingCenter = trainingCenter;
  if (batchName) filters.batchName = batchName;
  if (district) filters.district = district;
  if (search) filters.search = search;
  if (status && status !== 'all') filters.completionStatus = status;

  let result = await traineeRepository.findAll(filters);
  if (filters.completionStatus) {
    const needle = String(filters.completionStatus).toLowerCase();
    result = {
      ...result,
      items: result.items.filter((t) =>
        (field(t, 'completionStatus', 'completion_status') || '').toLowerCase().includes(needle)
      ),
    };
  }

  // Latest outcome per trainee for the register grid (single pass, no N+1).
  const outcomePage = await outcomeRepository.findAll({ limit: 200, page: 1 });
  const latestByTrainee = new Map();
  outcomePage.items.forEach((raw) => {
    const o = shapeOutcome(raw);
    const key = o.traineeId;
    if (!latestByTrainee.has(key)) latestByTrainee.set(key, o); // repo returns newest-first
  });

  const trainees = result.items.map((raw) => {
    const t = shapeTrainee(raw);
    const o = latestByTrainee.get(t.id) || null;
    return {
      ...t,
      latestOutcome: o,
      verificationStatus: o ? o.verificationStatus : null,
      status: o ? o.status : null,
    };
  });

  return ApiResponse.ok(
    res,
    { trainees, count: trainees.length, total: result.total, page: result.page, limit: result.limit, filters },
    'Trainee list fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/trainees/:traineeId — dossier payload (trainee + outcomes +
// follow-ups) for the audit drawer.
// ---------------------------------------------------------------------------
const getTrainee = asyncHandler(async (req, res) => {
  const { traineeId } = req.params;
  const raw = await traineeRepository.findById(traineeId);
  if (!raw) throw ApiError.notFound('Trainee not found.');

  const trainee = shapeTrainee(raw);
  const [outcomeResult, followupResult] = await Promise.all([
    outcomeRepository.findAll({ traineeId, limit: 200, page: 1 }),
    followupRepository.findAll({ traineeId, limit: 200, page: 1 }),
  ]);

  const outcomes = (outcomeResult.items || outcomeResult).map(shapeOutcome);
  const followups = (followupResult.items || followupResult).map(shapeFollowup);

  return ApiResponse.ok(
    res,
    { trainee, outcomes, followups },
    'Trainee dossier fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/outcomes — filterable, paginated, trainee-enriched listing
// ---------------------------------------------------------------------------
const listOutcomes = asyncHandler(async (req, res) => {
  const { status, verificationStatus, traineeId, page, limit } = req.query;
  const filters = { page, limit };
  if (status) filters.status = status;
  if (verificationStatus) filters.verificationStatus = verificationStatus;
  if (traineeId) filters.traineeId = traineeId;

  const result = await outcomeRepository.findAll(filters);
  const outcomes = await enrichOutcomes(result.items);

  return ApiResponse.ok(
    res,
    { outcomes, count: outcomes.length, total: result.total, page: result.page, limit: result.limit, filters },
    'Outcome list fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// PUT /api/admin/outcomes/:outcomeId/verify — one-time verification
// ---------------------------------------------------------------------------
const verifyOutcome = asyncHandler(async (req, res) => {
  const { outcomeId } = req.params;
  const { verificationStatus, status, remarks } = req.body || {};

  const chosen = verificationStatus || status;
  if (!chosen || !VERIFICATION_STATUSES.includes(String(chosen).toLowerCase())) {
    throw ApiError.badRequest(`verificationStatus must be one of: ${VERIFICATION_STATUSES.join(', ')}.`);
  }
  const finalStatus = String(chosen).toLowerCase();

  const outcome = await outcomeRepository.findById(outcomeId);
  if (!outcome) throw ApiError.notFound('Outcome not found.');

  const currentVerification = field(outcome, 'verificationStatus', 'verification_status');
  if (currentVerification !== 'pending') {
    throw ApiError.conflict(`This outcome has already been ${currentVerification}.`);
  }

  const updated = await outcomeRepository.updateById(outcomeId, {
    verificationStatus: finalStatus,
    verifiedBy: req.user.userId,
    remarks: remarks || undefined,
  });

  return ApiResponse.ok(res, shapeOutcome(updated), `Outcome ${finalStatus} successfully.`);
});

// ---------------------------------------------------------------------------
// POST /api/admin/outcomes/batch-verify — verify/reject several pending
// outcomes at once. Body: { outcomeIds: string[], decision: 'verified'|'rejected', remarks? }
// Each outcome is decided independently; invalid ones are reported per-item.
// ---------------------------------------------------------------------------
const batchVerifyOutcomes = asyncHandler(async (req, res) => {
  const { outcomeIds, decision, verificationStatus, remarks } = req.body || {};

  const chosen = decision || verificationStatus;
  if (!chosen || !VERIFICATION_STATUSES.includes(String(chosen).toLowerCase())) {
    throw ApiError.badRequest(`decision must be one of: ${VERIFICATION_STATUSES.join(', ')}.`);
  }
  const finalStatus = String(chosen).toLowerCase();

  if (!Array.isArray(outcomeIds) || outcomeIds.length === 0) {
    throw ApiError.badRequest('outcomeIds must be a non-empty array of outcome ids.');
  }
  if (outcomeIds.length > 200) {
    throw ApiError.badRequest('A maximum of 200 outcomes can be batch-verified per request.');
  }

  const results = [];
  for (const id of outcomeIds.slice(0, 200)) {
    try {
      const outcome = await outcomeRepository.findById(id);
      if (!outcome) {
        results.push({ id, success: false, message: 'Outcome not found.' });
        continue;
      }
      const current = field(outcome, 'verificationStatus', 'verification_status');
      if (current !== 'pending') {
        results.push({ id, success: false, message: `Already ${current}.` });
        continue;
      }
      await outcomeRepository.updateById(id, {
        verificationStatus: finalStatus,
        verifiedBy: req.user.userId,
        remarks: remarks || undefined,
      });
      results.push({ id, success: true, message: `Outcome ${finalStatus}.` });
    } catch (err) {
      results.push({ id, success: false, message: err.message || 'Verification failed.' });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  return ApiResponse.ok(
    res,
    { results, verified: succeeded, failed: results.length - succeeded },
    `Batch verification complete: ${succeeded} ${finalStatus}, ${results.length - succeeded} skipped/failed.`
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/analytics — placement & salary analytics
// ---------------------------------------------------------------------------
const getAnalytics = asyncHandler(async (req, res) => {
  const [traineeResult, outcomeResult] = await Promise.all([
    traineeRepository.findAll({ limit: 1 }),
    outcomeRepository.findAll({ limit: 1 }),
  ]);

  const trainees = traineeResult.items.map(shapeTrainee);
  const outcomes = outcomeResult.items.map(shapeOutcome);

  const traineeById = new Map(trainees.map((t) => [t.id, t]));
  const outcomeWithTrainee = outcomes.map((o) => ({
    ...o,
    trainee: traineeById.get(o.traineeId) || null,
  }));

  const isPlaced = (o) => ['employed', 'self_employed'].includes((o.status || '').toLowerCase());

  /** Group placement rate by a trainee attribute. */
  const placementBy = (attr, label) => {
    const groups = new Map();
    outcomeWithTrainee.forEach((o) => {
      const key = (o.trainee && o.trainee[attr]) || 'Unknown';
      if (!groups.has(key)) groups.set(key, { total: 0, placed: 0 });
      const g = groups.get(key);
      g.total += 1;
      if (isPlaced(o)) g.placed += 1;
    });
    return [...groups.entries()]
      .filter(([key]) => key !== 'Unknown' || groups.size === 1)
      .map(([key, g]) => ({
        [label]: key,
        totalOutcomes: g.total,
        placed: g.placed,
        placementRate: `${((g.placed / g.total) * 100).toFixed(1)}%`,
      }))
      .sort((a, b) => b.placed - a.placed);
  };

  const placementByTrade = placementBy('trade', 'trade');
  const placementByCenter = placementBy('trainingCenter', 'center');
  const placementByPartner = placementBy('trainingPartner', 'partner');

  const salaries = outcomes
    .filter((o) => isPlaced(o) && Number(field(o, 'monthlySalary', 'monthly_salary')) > 0)
    .map((o) => Number(field(o, 'monthlySalary', 'monthly_salary')));

  const salaryDistribution = {
    count: salaries.length,
    min: salaries.length ? Math.min(...salaries) : 0,
    max: salaries.length ? Math.max(...salaries) : 0,
    average: salaries.length ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0,
    median: salaries.length
      ? (() => {
          const sorted = [...salaries].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        })()
      : 0,
  };

  const statusDistribution = {};
  OUTCOME_STATUSES.forEach((s) => {
    statusDistribution[s] = outcomes.filter((o) => (o.status || '').toLowerCase() === s).length;
  });

  // --- Verified placement rate (verified outcomes only) ---
  const verifiedOutcomes = outcomes.filter((o) => o.verificationStatus === 'verified');
  const verifiedPlaced = verifiedOutcomes.filter(isPlaced).length;
  const verifiedPlacementRate =
    verifiedOutcomes.length > 0 ? `${((verifiedPlaced / verifiedOutcomes.length) * 100).toFixed(1)}%` : null;

  // --- Skill-gap sector view (TRD FR-14 extension) ---
  // Demand-side vacancies are NOT collected by any MahaKaushalya entity (TRD
  // integration table: no employer demand feed). We therefore compute the
  // SUPPLY side from real outcomes and expose vacancies as `null` so the UI
  // can render the deficit honestly instead of inventing a benchmark.
  const sectors = placementByTrade.map((row) => {
    const tradeTrainees = trainees.filter((t) => t.trade === row.trade);
    const tradeOutcomeIds = new Set(outcomeWithTrainee.filter((o) => o.trainee && o.trainee.trade === row.trade).map((o) => o.id));
    const tradeOutcomes = outcomes.filter((o) => tradeOutcomeIds.has(o.id));
    const absorbed = tradeOutcomes.filter(isPlaced).length;
    const unemployed = tradeOutcomes.filter((o) => (o.status || '').toLowerCase() === 'unemployed').length;
    return {
      tradeName: row.trade,
      nsqfLevel: null, // TBC — not stored on any entity
      cluster: null, // TBC — not stored on any entity
      supply: tradeTrainees.length,
      absorbed,
      vacancies: null, // TBC — no demand-side data source
      unplacedPool: unemployed,
      // Deficit percent is computable ONLY from outcome mix; badge logic in the
      // UI treats >50% unplaced as critical, 25-50% as high.
      unplacedPercent: tradeOutcomes.length ? `${((unemployed / tradeOutcomes.length) * 100).toFixed(1)}%` : null,
    };
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
      verifiedPlacementRate,
      sectors,
    },
    'Analytics data fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/followups — filterable, paginated listing
// ---------------------------------------------------------------------------
const listFollowups = asyncHandler(async (req, res) => {
  const { status, traineeId, channel, page, limit } = req.query;
  const filters = { page, limit };
  if (status) filters.status = status;
  if (traineeId) filters.traineeId = traineeId;
  if (channel) filters.channel = channel;

  const result = await followupRepository.findAll(filters);

  // Join trainee identity for the officer view.
  const traineePage = await traineeRepository.findAll({ limit: 1 });
  const byId = new Map(traineePage.items.map((t) => [t.id, shapeTrainee(t)]));
  const followups = (result.items || result).map((raw) => {
    const f = shapeFollowup(raw);
    const t = byId.get(f.traineeId);
    return {
      ...f,
      trainee: t ? { id: t.id, prn: t.prn, fullName: t.fullName, phone: t.phone, trade: t.trade } : null,
    };
  });

  return ApiResponse.ok(
    res,
    { followups, count: followups.length, total: result.total, page: result.page, limit: result.limit, filters },
    'Follow-up list fetched successfully.'
  );
});

// ---------------------------------------------------------------------------
// POST /api/admin/followups — officer-initiated follow-up prompt.
// Body: { traineeId, question?, channel? ('sms'|'whatsapp') }
// Creates the pending prompt record ONLY. Actual SMS/WhatsApp dispatch
// requires a gateway that is not integrated (TRD integration table) — the
// response states this explicitly instead of pretending delivery happened.
// ---------------------------------------------------------------------------
const createFollowup = asyncHandler(async (req, res) => {
  const { traineeId, question, channel } = req.body || {};

  if (!isNonEmptyString(traineeId)) {
    throw ApiError.badRequest('traineeId is required.');
  }
  const trainee = await traineeRepository.findById(traineeId);
  if (!trainee) throw ApiError.notFound('Trainee not found.');

  const finalChannel = FOLLOWUP_CHANNELS.includes(channel) ? channel : 'sms';
  const finalQuestion = isNonEmptyString(question)
    ? question.trim()
    : 'MSSDS follow-up: please confirm your current employment status.';

  const followup = await followupRepository.create({
    traineeId,
    channel: finalChannel,
    question: finalQuestion,
  });

  return ApiResponse.created(
    res,
    { ...shapeFollowup(followup), trainee: { id: trainee.id, prn: trainee.prn, fullName: trainee.fullName } },
    'Follow-up prompt created (pending). Note: SMS/WhatsApp delivery requires a gateway that is not yet integrated; the prompt is visible to the trainee on their dashboard.'
  );
});

// ---------------------------------------------------------------------------
// GET /api/admin/queue/non-responders
// ---------------------------------------------------------------------------
const listNonResponders = asyncHandler(async (req, res) => {
  const [followupResult, traineeResult] = await Promise.all([
    followupRepository.findAll({ status: 'pending', limit: 1 }),
    traineeRepository.findAll({ limit: 1 }),
  ]);

  const byId = new Map(traineeResult.items.map((t) => [t.id, shapeTrainee(t)]));
  const queue = (followupResult.items || followupResult).map((raw) => {
    const f = shapeFollowup(raw);
    const t = byId.get(f.traineeId) || {};
    const sentAt = f.sentAt ? new Date(f.sentAt) : null;
    const daysOverdue = sentAt ? Math.max(0, Math.floor((Date.now() - sentAt.getTime()) / 86400000)) : 0;
    return {
      followupId: f.id,
      traineeId: f.traineeId,
      uid: t.prn || '—',
      name: t.fullName || 'Unknown trainee',
      phone: t.phone || '—',
      course: t.courseName || t.trade || 'Vocational Trade',
      vtp: t.trainingCenter || '—',
      channel: (f.channel || 'sms').toUpperCase() === 'WHATSAPP' ? 'WhatsApp' : 'SMS',
      stage: '6-Month Retention',
      overdue: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
      daysOverdue,
      attempts: 1,
      question: f.question,
      sentAt: f.sentAt,
    };
  });

  return ApiResponse.ok(res, queue, 'Non-responder queue fetched successfully.');
});

// ---------------------------------------------------------------------------
// POST /api/admin/queue/trigger-campaign
// Body: { candidateIds: string[] (PRNs), channel?: 'sms'|'whatsapp' }
// Creates NEW pending follow-up prompts for the selected trainees. This is a
// real data operation, but it is NOT a message dispatch — the SMS/WhatsApp
// gateway is not integrated (TRD §9), so responses state that plainly.
// ---------------------------------------------------------------------------
const triggerCampaign = asyncHandler(async (req, res) => {
  const { candidateIds, channel, question } = req.body || {};

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    throw ApiError.badRequest('candidateIds must be a non-empty array of trainee PRNs.');
  }

  const allTrainees = await traineeRepository.findAll({ limit: 1 });
  const byPrn = new Map(allTrainees.items.map((t) => [t.prn, t]));

  const finalChannel = FOLLOWUP_CHANNELS.includes(channel) ? channel : 'sms';
  const finalQuestion = isNonEmptyString(question)
    ? question.trim()
    : 'MSSDS outreach: please update your current employment status on the MahaKaushalya trainee portal.';

  const results = [];
  for (const prn of candidateIds.slice(0, 500)) {
    const trainee = byPrn.get(prn);
    if (!trainee) {
      results.push({ candidateId: prn, success: false, message: 'Trainee not found.' });
      continue;
    }
    // Replace at most one still-pending prompt per trainee to avoid stacking.
    const pending = await followupRepository.findAll({ traineeId: trainee.id, status: 'pending', limit: 1 });
    if ((pending.items || pending).length > 0) {
      results.push({ candidateId: prn, success: true, message: 'Pending follow-up already exists — prompt refreshed.', skipped: true });
      continue;
    }
    const created = await followupRepository.create({
      traineeId: trainee.id,
      channel: finalChannel,
      question: finalQuestion,
    });
    results.push({ candidateId: prn, followupId: created.id, success: true, message: 'Follow-up prompt created (pending).' });
  }

  const queued = results.filter((r) => r.success).length;
  return ApiResponse.ok(
    res,
    { results, queued, channel: finalChannel },
    `Campaign processed for ${queued} of ${results.length} selected trainees. No SMS/WhatsApp was dispatched — the gateway is not integrated (TRD §9); trainees see the prompt on their dashboard.`
  );
});

module.exports = {
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
};
