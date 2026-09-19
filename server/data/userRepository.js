'use strict';

const { env, store, supabase } = require('./datasource');
const { generateId } = require('../utils/idGenerator');

const TABLE = 'users';

const toCamel = (u) =>
  u && {
    id: u.id,
    email: u.email,
    phone: u.phone,
    role: u.role,
    traineeId: u.trainee_id || null,
    createdAt: u.created_at,
  };

async function findByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .ilike('email', normalized)
      .maybeSingle();
    if (error) throw error;
    return toCamel(data);
  }

  return store.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

async function findByPhone(phone) {
  if (!phone) return null;

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).select('*').eq('phone', phone).maybeSingle();
    if (error) throw error;
    return toCamel(data);
  }

  return store.users.find((u) => u.phone === phone) || null;
}

async function findById(id) {
  if (!id) return null;

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return toCamel(data);
  }

  return store.users.find((u) => u.id === id) || null;
}

/**
 * Create a new user record.
 * @param {object} payload { email, phone, passwordHash, role, traineeId }
 */
async function create(payload) {
  const now = new Date().toISOString();
  const record = {
    id: generateId(),
    email: payload.email,
    phone: payload.phone || null,
    password_hash: payload.passwordHash,
    role: payload.role || 'trainee',
    trainee_id: payload.traineeId || null,
    created_at: now,
  };

  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase.from(TABLE).insert(record).select().single();
    if (error) throw error;
    return toCamel(data);
  }

  store.users.push(record);
  return toCamel(record);
}

/**
 * Link a trainee profile id back onto the user record.
 */
async function linkTrainee(userId, traineeId) {
  if (env.DATA_PROVIDER === 'supabase') {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ trainee_id: traineeId })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return toCamel(data);
  }

  const user = store.users.find((u) => u.id === userId);
  if (user) {
    user.trainee_id = traineeId;
    return toCamel(user);
  }
  return null;
}

module.exports = { findByEmail, findByPhone, findById, create, linkTrainee };
