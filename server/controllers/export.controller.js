'use strict';

/**
 * Real server-side CSV exports for the Government/Admin portal.
 * These replace the previous frontend "toast-only" export buttons with a
 * genuine download of the CURRENT filtered dataset. PDF/Excel formatting is
 * still out of scope (TRD §3) — CSV opens cleanly in Excel.
 */

const asyncHandler = require('../utils/asyncHandler');
const traineeRepository = require('../data/traineeRepository');
const outcomeRepository = require('../data/outcomeRepository');

/** CSV field escaping per RFC 4180. */
function esc(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  const lines = [headers.join(',')];
  rows.forEach((row) => lines.push(row.map(esc).join(',')));
  return lines.join('\r\n');
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`\uFEFF${csv}`); // BOM so Excel detects UTF-8
}

function csvDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

// ---------------------------------------------------------------------------
// GET /api/admin/export/trainees.csv — honors the same filters as /trainees
// ---------------------------------------------------------------------------
const exportTraineesCsv = asyncHandler(async (req, res) => {
  const { trade, trainingCenter, batchName, district, search, status } = req.query;
  const filters = {};
  if (trade) filters.trade = trade;
  if (trainingCenter) filters.trainingCenter = trainingCenter;
  if (batchName) filters.batchName = batchName;
  if (district) filters.district = district;
  if (search) filters.search = search;
  if (status && status !== 'all') filters.completionStatus = status;

  const result = await traineeRepository.findAll({ ...filters, limit: 200, page: 1 });

  const headers = [
    'PRN', 'Full Name', 'Email', 'Phone', 'Gender', 'DOB', 'District',
    'Trade', 'Course', 'Batch', 'Training Center', 'Training Partner',
    'Completion Month', 'Completion Year', 'Completion Status', 'Registered On',
  ];
  const rows = result.items.map((t) => [
    t.prn,
    t.fullName || t.full_name,
    t.email,
    t.phone,
    t.gender,
    t.dob,
    t.district,
    t.trade,
    t.courseName || t.course_name,
    t.batchName || t.batch_name,
    t.trainingCenter || t.training_center,
    t.trainingPartner || t.training_partner,
    t.completionMonth || t.completion_month,
    t.completionYear || t.completion_year,
    t.completionStatus || t.completion_status,
    csvDate(t.createdAt || t.created_at),
  ]);

  sendCsv(res, `mahakaushalya-trainees-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
});

// ---------------------------------------------------------------------------
// GET /api/admin/export/outcomes.csv — honors the same filters as /outcomes
// ---------------------------------------------------------------------------
const exportOutcomesCsv = asyncHandler(async (req, res) => {
  const { status, verificationStatus, traineeId } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (verificationStatus) filters.verificationStatus = verificationStatus;
  if (traineeId) filters.traineeId = traineeId;

  const result = await outcomeRepository.findAll({ ...filters, limit: 200, page: 1 });
  const trainees = await traineeRepository.findAll({ limit: 200, page: 1 });
  const byId = new Map(trainees.items.map((t) => [t.id, t]));

  const headers = [
    'Outcome ID', 'PRN', 'Trainee', 'District', 'Trade',
    'Status', 'Outcome Type', 'Employer', 'Designation',
    'Monthly Salary', 'Joining Date', 'Work Location', 'Industry',
    'Verification Status', 'Verified At', 'Remarks', 'Submitted At',
  ];
  const rows = result.items.map((o) => {
    const t = byId.get(o.traineeId || o.trainee_id) || {};
    return [
      o.id,
      t.prn || '',
      t.fullName || t.full_name || '',
      t.district || '',
      t.trade || '',
      o.status,
      o.outcomeType || o.outcome_type || '',
      o.employerName || o.employer_name || '',
      o.designation || '',
      o.monthlySalary || o.monthly_salary || '',
      o.joiningDate || o.joining_date || '',
      o.workLocation || o.work_location || '',
      o.industry || '',
      o.verificationStatus || o.verification_status || 'pending',
      csvDate(o.verifiedAt || o.verified_at),
      o.remarks || '',
      csvDate(o.submittedAt || o.submitted_at || o.createdAt || o.created_at),
    ];
  });

  sendCsv(res, `mahakaushalya-outcomes-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
});

module.exports = { exportTraineesCsv, exportOutcomesCsv };
