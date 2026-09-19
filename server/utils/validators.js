'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // 10-digit Indian mobile number

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(value) {
  return isNonEmptyString(value) && EMAIL_RE.test(value.trim());
}

function isValidPhone(value) {
  return isNonEmptyString(value) && PHONE_RE.test(value.trim());
}

function isValidPassword(value) {
  return isNonEmptyString(value) && value.length >= 6;
}

const OUTCOME_STATUSES = ['employed', 'self_employed', 'higher_studies', 'unemployed'];
const FOLLOWUP_CHANNELS = ['sms', 'whatsapp'];
const OUTCOME_TYPES = [
  'wage_employment',
  'self_employment',
  'higher_education',
  'apprenticeship',
  'seeking_job',
];

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidPhone,
  isValidPassword,
  OUTCOME_STATUSES,
  FOLLOWUP_CHANNELS,
  OUTCOME_TYPES,
};
