/**
 * MahaKaushalya — shared auth module (included by BOTH portals).
 * ---------------------------------------------------------------------------
 * Single source of truth for:
 *   - token storage (localStorage key: "mahakaushalya_token")
 *   - API_BASE_URL (defined ONCE here)
 *   - saveToken / getToken / clearToken / isLoggedIn
 *   - apiFetch() wrapper: auto-attaches Authorization: Bearer and redirects
 *     to the correct portal's login page on a 401.
 *
 * Both portals load this as an ES module. The portal identifies itself with
 * PORTAL ('trainee' | 'admin') so 401 redirects land on the right login page.
 */

// ---- Single API base URL — referenced everywhere, never hardcoded ----
// Deployed behind the same Express server (Railway, Render, ...): served from
// the SAME origin as the API, so we default to "" (relative URLs like
// /api/trainee/... hit the same host). For local development set
// window.MAHAKAUSHALYA_API_BASE_URL = 'http://localhost:5000' (the preview
// launcher already does this — see preview-server.js) before the portals load.
const API_BASE_URL =
  (typeof window !== 'undefined' && window.MAHAKAUSHALYA_API_BASE_URL) || '';

// ---- Single localStorage token key for BOTH portals ----
const TOKEN_STORAGE_KEY = 'mahakaushalya_token';

const PORTAL = window.MAHAKAUSHALYA_PORTAL || 'trainee';

const LOGIN_PAGES = {
  trainee: 'trainee_login.html',
  admin: 'index.html',
};

function getLoginRedirectUrl() {
  return LOGIN_PAGES[PORTAL] || LOGIN_PAGES.trainee;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
function saveToken(token) {
  if (!token) return;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (e) {
    console.warn('[auth] localStorage unavailable:', e);
  }
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (e) {
    console.warn('[auth] localStorage unavailable:', e);
    return null;
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}

function isLoggedIn() {
  return Boolean(getToken());
}

/**
 * Pull a token out of an API response payload regardless of nesting
 * (data.token, token, accessToken, ...).
 */
function extractToken(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload.token ||
    payload.accessToken ||
    payload.access_token ||
    payload.jwt ||
    payload.data?.token ||
    payload.data?.accessToken ||
    payload.data?.access_token ||
    null
  );
}

// ---------------------------------------------------------------------------
// apiFetch — the ONLY way frontend code talks to the backend
// ---------------------------------------------------------------------------

/**
 * Fetch wrapper used by every page in both portals.
 * - path may be "/api/trainee/..." or "/api/admin/..." (relative to API_BASE_URL)
 * - automatically attaches Authorization: Bearer <token> when a token exists
 * - JSON-encodes plain-object bodies
 * - on 401: clears the stored token and redirects to this portal's login page
 *
 * @param {string} path
 * @param {{ method?: string, body?: object|FormData, headers?: Record<string,string>, auth?: boolean }} [options]
 * @returns {Promise<{ok: boolean, status: number, data: any, message: string}>}
 */
async function apiFetch(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
  } = options;

  const url = /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const reqHeaders = { Accept: 'application/json', ...headers };

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (networkErr) {
    return {
      ok: false,
      status: 0,
      data: null,
      message: 'Unable to reach the MahaKaushalya API. Is the backend running on port 5000?',
    };
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  // 401 -> session invalid: clear token and bounce to the portal's login page
  if (response.status === 401 && auth) {
    clearToken();
    window.setTimeout(() => {
      window.location.href = getLoginRedirectUrl();
    }, 1200);
  }

  const message =
    (data && typeof data === 'object' && (data.message || data.error || data.detail)) ||
    `Request failed (HTTP ${response.status}).`;

  return {
    ok: response.ok,
    status: response.status,
    data: data && typeof data === 'object' && 'data' in data ? data.data : data,
    message,
  };
}

// ---------------------------------------------------------------------------
// Window bindings so inline handlers / non-module scripts can use it too
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.MahaAuth = {
    API_BASE_URL,
    TOKEN_STORAGE_KEY,
    PORTAL,
    saveToken,
    getToken,
    clearToken,
    isLoggedIn,
    extractToken,
    apiFetch,
  };
}

export {
  API_BASE_URL,
  TOKEN_STORAGE_KEY,
  saveToken,
  getToken,
  clearToken,
  isLoggedIn,
  extractToken,
  apiFetch,
};

/**
 * Read the role claim from the stored JWT (null if absent/unparseable).
 * Roles mirror schema.sql's user_role enum: admin | government | officer |
 * analyst (officer side) and trainee (public side).
 */
export function getTokenRole() {
  try {
    const token = getToken() || '';
    const payload = JSON.parse(atob(token.split('.')[1] || 'e30='));
    return payload.role || null;
  } catch {
    return null;
  }
}

export const OFFICER_ROLES = ['admin', 'government', 'officer', 'analyst'];

/** True when the stored token belongs to a Government/officer account. */
export function hasOfficerRole() {
  return OFFICER_ROLES.includes(getTokenRole());
}
