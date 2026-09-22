'use strict';

const { env, store, supabase } = require('./datasource');
const { generateId } = require('../utils/idGenerator');

const TABLE = 'followups';

/**
 * Shared server-side pagination (NFR-003). `page` is 1-based; `limit` defaults
 * to 50 (max 200). Returns the sliced page plus the total pre-pagination count.
 */
function paginate(results, filters) {
  const total = results.length;
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 200);
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const start = (page - 1) * limit;
  const items = results.slice(start, start + limit);
  return { items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

/**
 * Find pending follow-ups for a trainee (those awaiting a response).
 */
async function findPendingByTraineeId(traineeId) {
  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('trainee_id', traineeId)
      .eq('status', 'pending')
      .order('sent_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  return store.followups
    .filter((f) => f.traineeId === traineeId && f.status === 'pending')
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

async function findById(id) {
  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return store.followups.find((f) => f.id === id) || null;
}

/**
 * Create a follow-up prompt (typically triggered by an admin/cron job, but
 * exposed so the system can seed/send new prompts).
 */
async function create(payload) {
  const now = new Date().toISOString();
  const record = {
    id: generateId(),
    trainee_id: payload.traineeId,
    outcome_id: payload.outcomeId || null,
    channel: payload.channel || 'sms', // 'sms' | 'whatsapp'
    question: payload.question,
    response: null,
    status: 'pending', // 'pending' | 'responded'
    sent_at: now,
    responded_at: null,
  };

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).insert(record).select().single();
    if (error) throw error;
    return data;
  }

  const mapped = {
    id: record.id,
    traineeId: record.trainee_id,
    outcomeId: record.outcome_id,
    channel: record.channel,
    question: record.question,
    response: record.response,
    status: record.status,
    sentAt: record.sent_at,
    respondedAt: record.responded_at,
  };
  store.followups.push(mapped);
  return mapped;
}

/**
 * Record a trainee's response to a follow-up prompt.
 */
async function recordResponse(id, response) {
  const now = new Date().toISOString();

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ response, status: 'responded', responded_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const idx = store.followups.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  store.followups[idx] = {
    ...store.followups[idx],
    response,
    status: 'responded',
    respondedAt: now,
  };
  return store.followups[idx];
}

/**
 * Fetch all follow-ups, optionally filtered. Used by admin endpoints.
 */
async function findAll(filters = {}) {
  if (env.DATA_PROVIDER === 'supabase') {
    let query = supabase.from(TABLE).select('*').order('sent_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.traineeId) query = query.eq('trainee_id', filters.traineeId);
    if (filters.channel) query = query.eq('channel', filters.channel);

    // Server-side pagination (NFR-003)
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    query = query.range((page - 1) * limit, page * limit - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    return { items: data, total: count, page, limit };
  }

  let results = [...store.followups];
  if (filters.status) results = results.filter((f) => f.status === filters.status);
  if (filters.traineeId) results = results.filter((f) => f.traineeId === filters.traineeId);
  if (filters.channel) results = results.filter((f) => f.channel === filters.channel);
  results.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  return paginate(results, filters);
}

module.exports = { findPendingByTraineeId, findById, create, recordResponse, findAll };
