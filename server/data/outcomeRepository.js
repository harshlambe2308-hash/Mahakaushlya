'use strict';

const { env, store, supabase } = require('./datasource');
const { generateId } = require('../utils/idGenerator');

const TABLE = 'outcomes';

/**
 * Create a new outcome submission for a trainee.
 * `status` uses the reconciled vocabulary: employed | self_employed |
 * higher_studies | unemployed (plus apprenticeship accepted as an alias of
 * higher_studies per the merged schema decision).
 */
async function create(payload) {
  const now = new Date().toISOString();
  const record = {
    id: generateId(),
    trainee_id: payload.traineeId,
    status: payload.status,
    outcome_type: payload.outcomeType || null,
    employer_name: payload.employerName || null,
    designation: payload.designation || null,
    monthly_salary: payload.monthlySalary != null ? payload.monthlySalary : null,
    joining_date: payload.joiningDate || null,
    work_location: payload.workLocation || null,
    proof_document_url: payload.proofDocumentUrl || null,
    remarks: payload.remarks || null,
    verification_status: 'pending',
    submitted_at: now,
    verified_at: null,
    verified_by: null,
  };

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).insert(record).select().single();
    if (error) throw error;
    return data;
  }

  const mapped = {
    id: record.id,
    traineeId: record.trainee_id,
    status: record.status,
    outcomeType: record.outcome_type,
    employerName: record.employer_name,
    designation: record.designation,
    monthlySalary: record.monthly_salary,
    joiningDate: record.joining_date,
    workLocation: record.work_location,
    proofDocumentUrl: record.proof_document_url,
    remarks: record.remarks,
    verificationStatus: record.verification_status,
    submittedAt: record.submitted_at,
    verifiedAt: record.verified_at,
    verifiedBy: record.verified_by,
  };
  store.outcomes.push(mapped);
  return mapped;
}

/**
 * Fetch full outcome submission history for a trainee, newest first.
 */
async function findByTraineeId(traineeId) {
  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('trainee_id', traineeId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  return store.outcomes
    .filter((o) => o.traineeId === traineeId)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

/**
 * Fetch the most recent outcome for a trainee (used on the dashboard).
 */
async function findLatestByTraineeId(traineeId) {
  const history = await findByTraineeId(traineeId);
  return history.length ? history[0] : null;
}

async function findById(id) {
  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return store.outcomes.find((o) => o.id === id) || null;
}

/**
 * Fetch all outcomes, optionally filtered. Used by admin endpoints.
 */
async function findAll(filters = {}) {
  if (env.DATA_PROVIDER === 'supabase') {
    let query = supabase.from(TABLE).select('*').order('submitted_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.verificationStatus) query = query.eq('verification_status', filters.verificationStatus);
    if (filters.traineeId) query = query.eq('trainee_id', filters.traineeId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  let results = [...store.outcomes];
  if (filters.status) results = results.filter((o) => o.status === filters.status);
  if (filters.verificationStatus) {
    results = results.filter((o) => o.verificationStatus === filters.verificationStatus);
  }
  if (filters.traineeId) results = results.filter((o) => o.traineeId === filters.traineeId);
  return results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

/**
 * Update an outcome record (e.g. admin verification).
 */
async function updateById(id, updates) {
  const now = new Date().toISOString();

  if (env.DATA_PROVIDER === 'supabase') {
    const dbUpdates = {};
    if (updates.verificationStatus) dbUpdates.verification_status = updates.verificationStatus;
    if (updates.verifiedBy) dbUpdates.verified_by = updates.verifiedBy;
    if (updates.remarks) dbUpdates.remarks = updates.remarks;
    if (updates.verificationStatus === 'verified' || updates.verificationStatus === 'rejected') {
      dbUpdates.verified_at = now;
    }
    const { data, error } = await supabase.from(TABLE).update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const idx = store.outcomes.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  if (updates.verificationStatus) store.outcomes[idx].verificationStatus = updates.verificationStatus;
  if (updates.verifiedBy) store.outcomes[idx].verifiedBy = updates.verifiedBy;
  if (updates.remarks) store.outcomes[idx].remarks = updates.remarks;
  if (updates.verificationStatus === 'verified' || updates.verificationStatus === 'rejected') {
    store.outcomes[idx].verifiedAt = now;
  }
  return store.outcomes[idx];
}

module.exports = { create, findByTraineeId, findLatestByTraineeId, findById, findAll, updateById };
