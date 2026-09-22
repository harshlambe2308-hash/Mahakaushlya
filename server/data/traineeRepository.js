'use strict';

const { env, store, supabase } = require('./datasource');
const { generateId, generatePRN } = require('../utils/idGenerator');

const TABLE = 'trainees';

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

async function findByUserId(userId) {
  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }
  return store.trainees.find((t) => t.userId === userId) || null;
}

async function findById(id) {
  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return store.trainees.find((t) => t.id === id) || null;
}

async function create(payload) {
  const now = new Date().toISOString();
  const sequence =
    env.DATA_PROVIDER === 'supabase' ? Date.now() % 100000 : store.trainees.length + 1;

  const record = {
    id: generateId(),
    user_id: payload.userId,
    prn: payload.prn || generatePRN(sequence),
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    dob: payload.dob || null,
    gender: payload.gender || null,
    address_line: payload.address || null,
    district: payload.district || null,
    batch_name: payload.batchName || null,
    trade: payload.trade || null,
    course_name: payload.courseName || payload.trade || null,
    training_center: payload.trainingCenter || null,
    training_partner: payload.trainingPartner || null,
    profile_photo_url: payload.profilePhotoUrl || null,
    completion_month: payload.completionMonth || null,
    completion_year: payload.completionYear || null,
    completion_status: payload.completionStatus || 'completed',
    created_at: now,
    updated_at: now,
  };

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).insert(record).select().single();
    if (error) throw error;
    return data;
  }

  store.trainees.push({
    id: record.id,
    userId: record.user_id,
    prn: record.prn,
    fullName: record.full_name,
    email: record.email,
    phone: record.phone,
    dob: record.dob,
    gender: record.gender,
    address: record.address_line,
    district: record.district,
    batchName: record.batch_name,
    trade: record.trade,
    courseName: record.course_name,
    trainingCenter: record.training_center,
    trainingPartner: record.training_partner,
    profilePhotoUrl: record.profile_photo_url,
    completionMonth: record.completion_month,
    completionYear: record.completion_year,
    completionStatus: record.completion_status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  });
  return store.trainees[store.trainees.length - 1];
}

const CAMEL_TO_SNAKE = {
  fullName: 'full_name',
  email: 'email',
  phone: 'phone',
  dob: 'dob',
  gender: 'gender',
  address: 'address_line',
  district: 'district',
  batchName: 'batch_name',
  trade: 'trade',
  courseName: 'course_name',
  trainingCenter: 'training_center',
  trainingPartner: 'training_partner',
  profilePhotoUrl: 'profile_photo_url',
};

/**
 * Update a trainee profile. `updates` uses camelCase keys (as received from
 * controllers); this function maps them to snake_case columns for Supabase.
 */
async function updateById(id, updates) {
  const now = new Date().toISOString();

  if (env.DATA_PROVIDER === 'supabase') {
    const dbUpdates = { updated_at: now };
    Object.keys(updates).forEach((key) => {
      const column = CAMEL_TO_SNAKE[key];
      if (column) dbUpdates[column] = updates[key];
    });
    const { data, error } = await supabase.from(TABLE).update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const idx = store.trainees.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  store.trainees[idx] = { ...store.trainees[idx], ...updates, updatedAt: now };
  return store.trainees[idx];
}

/**
 * Fetch all trainees, optionally filtered by trade, training center, batch,
 * district or training partner. Used by admin endpoints.
 */
async function findAll(filters = {}) {
  if (env.DATA_PROVIDER === 'supabase') {
    let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
    if (filters.trade) query = query.ilike('trade', `%${filters.trade}%`);
    if (filters.trainingCenter) query = query.ilike('training_center', `%${filters.trainingCenter}%`);
    if (filters.batchName) query = query.ilike('batch_name', `%${filters.batchName}%`);
    if (filters.district) query = query.ilike('district', `%${filters.district}%`);
    if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,prn.ilike.%${filters.search}%`);

    // Server-side pagination (NFR-003)
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    query = query.range((page - 1) * limit, page * limit - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    return { items: data, total: count, page, limit };
  }

  let results = [...store.trainees];
  if (filters.trade) {
    const f = filters.trade.toLowerCase();
    results = results.filter((t) => (t.trade || '').toLowerCase().includes(f));
  }
  if (filters.trainingCenter) {
    const f = filters.trainingCenter.toLowerCase();
    results = results.filter((t) => (t.trainingCenter || '').toLowerCase().includes(f));
  }
  if (filters.batchName) {
    const f = filters.batchName.toLowerCase();
    results = results.filter((t) => (t.batchName || '').toLowerCase().includes(f));
  }
  if (filters.district) {
    const f = filters.district.toLowerCase();
    results = results.filter((t) => (t.district || '').toLowerCase().includes(f));
  }
  if (filters.search) {
    const f = filters.search.toLowerCase();
    results = results.filter(
      (t) =>
        (t.fullName || '').toLowerCase().includes(f) ||
        (t.prn || '').toLowerCase().includes(f)
    );
  }
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return paginate(results, filters);
}

module.exports = { findByUserId, findById, create, updateById, findAll };
