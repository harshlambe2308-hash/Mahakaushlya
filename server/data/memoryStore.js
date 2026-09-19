'use strict';

/**
 * In-memory data store
 * ---------------------------------------------------------------------------
 * Zero-dependency fallback data provider used when DATA_PROVIDER=memory.
 * Lets the merged API run and be tested locally without a real Supabase
 * project. Data resets whenever the process restarts.
 *
 * `authUsers` mirrors Supabase's `auth.users` table (email is the login
 * identifier there); `users` is the public `users` profile/role table.
 */
const store = {
  authUsers: [], // { id, email, createdAt } — Supabase auth mirror
  users: [], // { id, email, phone, passwordHash, role, traineeId, createdAt }
  trainees: [], // { id, userId, prn, fullName, email, phone, dob, gender, address,
  //   batchName, trade, trainingCenter, trainingPartner, district,
  //   courseName, createdAt, updatedAt }
  outcomes: [], // { id, traineeId, status, outcomeType, employerName, designation,
  //   monthlySalary, joiningDate, workLocation, proofDocumentUrl,
  //   verificationStatus, remarks, submittedAt, verifiedAt, verifiedBy }
  followups: [], // { id, traineeId, outcomeId, channel, question, response, status,
  //   sentAt, respondedAt }
};

module.exports = store;
