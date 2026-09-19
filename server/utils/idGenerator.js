'use strict';

const crypto = require('crypto');

/**
 * Generates a unique Permanent Registration Number (PRN) in the
 * MahaKaushalya format: MK-<year>-MH-<5 digit sequence>
 * e.g. MK-2024-MH-08492
 */
function generatePRN(sequence) {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, '0');
  return `MK-${year}-MH-${padded}`;
}

/**
 * Generates a short random unique id (used for in-memory primary keys).
 */
function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

module.exports = { generatePRN, generateId };
