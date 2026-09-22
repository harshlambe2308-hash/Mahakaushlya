'use strict';

const { env, store, supabase } = require('./datasource');
const { generateId } = require('../utils/idGenerator');
const traineeRepository = require('./traineeRepository');

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
    return withTraineeId(toCamel(data));
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
    return withTraineeId(toCamel(data));
  }

  return store.users.find((u) => u.id === id) || null;
}

/**
 * Create a new user record.
 * NOTE: schema.sql's `users` table has NO trainee_id column — the one-to-one
 * link is trainees.user_id. The in-memory store mirrors the traineeId on the
 * user record only as a dev convenience; the admin middleware resolves the
 * profile via traineeRepository.findByUserId when it is absent.
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
    traineeId: payload.traineeId || null,
    created_at: now,
  };

  if (env.DATA_PROVIDER === 'supabase') {
    const dbRecord = {
      id: record.id,
      email: record.email,
      phone: record.phone,
      password_hash: record.password_hash,
      role: record.role,
      created_at: record.created_at,
    };
    const { data, error } = await supabase.from(TABLE).insert(dbRecord).select().single();
    if (error) throw error;
    return toCamel(data);
  }

  store.users.push(record);
  return toCamel(record);
}

/**
 * Link a trainee profile id back onto the user record (in-memory only —
 * Supabase persists the link via trainees.user_id).
 */
async function linkTrainee(userId, traineeId) {
  if (env.DATA_PROVIDER === 'supabase') {
    return findById(userId);
  }

  const user = store.users.find((u) => u.id === userId);
  if (user) {
    user.traineeId = traineeId;
    return toCamel(user);
  }
  return null;
}

/**
 * Merge a trainee profile (id) into a user object so callers get the same
 * shape in both data providers.
 */
async function withTraineeId(user) {
  if (!user) return null;
  if (user.traineeId) return user;
  const profile = await traineeRepository.findByUserId(user.id);
  return { ...user, traineeId: profile ? profile.id : null };
}

module.exports = { findByEmail, findByPhone, findById, create, linkTrainee, withTraineeId };
