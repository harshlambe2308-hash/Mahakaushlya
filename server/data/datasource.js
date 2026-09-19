'use strict';

/**
 * Single shared Supabase handle for the repository layer.
 * Resolves to the ONE shared client from db/supabaseClient.js when
 * DATA_PROVIDER=supabase, otherwise null (in-memory mode).
 */
const env = require('../config/env');
const store = require('./memoryStore');
const supabase = require('../db/supabaseClient');

module.exports = { env, store, supabase };
