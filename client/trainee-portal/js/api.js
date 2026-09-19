/**
 * Trainee portal API layer.
 * Rewritten to call the MERGED backend at /api/trainee/* through the shared
 * auth module (apiFetch) — no raw fetch(), no hardcoded URLs.
 */
import { apiFetch, saveToken, extractToken } from '../../shared/auth.js';

function persistSession(payload) {
  const token = extractToken(payload);
  if (!token) {
    throw new Error('The server did not return an authentication token.');
  }
  saveToken(token);
}

/**
 * Low-level request helper kept for pages that need custom paths.
 */
export async function apiRequest(path, options = {}) {
  return apiFetch(path, options);
}

export const api = {
  register(body) {
    return apiFetch('/api/trainee/auth/register', { method: 'POST', body, auth: false });
  },
  login(body) {
    return apiFetch('/api/trainee/auth/login', { method: 'POST', body, auth: false });
  },
  getDashboard() {
    return apiFetch('/api/trainee/dashboard');
  },
  updateProfile(body) {
    return apiFetch('/api/trainee/profile', { method: 'PUT', body });
  },
  submitOutcome(body) {
    return apiFetch('/api/trainee/outcomes/submit', { method: 'POST', body });
  },
  getOutcomeHistory() {
    return apiFetch('/api/trainee/outcomes/history');
  },
  respondToFollowup(body) {
    return apiFetch('/api/trainee/followups/respond', { method: 'POST', body });
  },
};

/** Register + persist the returned token, used by registration page. */
export async function registerAndPersist(body) {
  const res = await api.register(body);
  if (res.ok && res.data) persistSession(res.data);
  return res;
}

/** Login + persist the returned token, used by the login page. */
export async function loginAndPersist(body) {
  const res = await api.login(body);
  if (res.ok && res.data) persistSession(res.data);
  return res;
}

export default api;
