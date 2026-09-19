'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

/**
 * SINGLE shared Supabase client for the whole merged backend.
 * Both trainee and admin routes import this one instance — there is exactly
 * one connection per process. When DATA_PROVIDER != 'supabase' this exports
 * null and the repository layer falls back to the in-memory store.
 */
let supabase = null;

if (env.DATA_PROVIDER === 'supabase') {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'DATA_PROVIDER is set to "supabase" but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing in the environment.'
    );
  }

  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

module.exports = supabase;
