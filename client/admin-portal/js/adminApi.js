/**
 * ============================================================
 * MahaKaushal Admin Portal — API client (rewritten)
 * ============================================================
 * All requests go through the SHARED auth module (../../shared/auth.js):
 *   - same localStorage token key as the trainee portal
 *   - same API_BASE_URL
 *   - automatic Bearer header + 401 redirect to the admin login page
 * Endpoints target the merged backend's /api/admin/* routes.
 * ============================================================
 */

import {
  apiFetch,
  getToken,
  saveToken,
  clearToken,
  isLoggedIn,
  extractToken,
} from '../../shared/auth.js';

// Re-exported for pages that import session helpers from this module.
export { isLoggedIn };

export const LOGIN_URL = 'index.html';

// Re-export shared token helpers under the admin names so existing page code
// (getAdminToken/setAdminToken/clearAdminToken) keeps working unchanged.
export const getAdminToken = getToken;
export const setAdminToken = saveToken;
export const clearAdminToken = clearToken;
export const requireAuth = isLoggedIn;

// Keep a showAdminBanner implementation (used by apiFetch fallbacks and pages)
export function showAdminBanner(message, type = 'info') {
  // Defensive swap if arguments were passed in reverse order
  if (message === 'success' || message === 'error' || message === 'info') {
    const tmp = message;
    message = type;
    type = tmp;
  }
  if (!['success', 'error', 'info'].includes(type)) type = 'info';

  let container = document.getElementById('admin-banner-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-banner-container';
    container.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const banner = document.createElement('div');
  banner.className = `admin-banner banner-${type}`;
  banner.setAttribute('role', 'alert');
  banner.style.cssText =
    'display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.15);background:#1c2f52;color:#fff;opacity:0;transition:opacity .3s;max-width:380px;';
  if (type === 'error') banner.style.background = '#b3261e';
  if (type === 'success') banner.style.background = '#146c2e';

  banner.textContent = message;
  container.appendChild(banner);
  requestAnimationFrame(() => (banner.style.opacity = '1'));

  setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  }, 5000);
}

/**
 * Authenticated admin API request to the merged backend.
 *
 * @param {string} endpoint — path after the API base, e.g. '/api/admin/trainees'
 * @param {Object} [options] — { method, body, headers, params }
 * @returns {Promise<{success: boolean, status?: number, data: any, message: string}>}
 */
export async function adminRequest(endpoint, options = {}) {
  const params = options.params || null;

  let path = endpoint;
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) path += (path.includes('?') ? '&' : '?') + qs;
  }

  const res = await apiFetch(path, {
    method: options.method || 'GET',
    body: options.body,
    headers: options.headers,
  });

  // 403 on an admin route with a trainee token -> helpfully redirect
  if (res.status === 403) {
    showAdminBanner('Access denied. Admin/government account required.', 'error');
  }

  return {
    success: res.ok,
    status: res.status,
    data: res.data,
    message: res.message,
  };
}

/**
 * Admin login — calls POST /api/admin/auth/login and persists the token.
 * Backend accepts roles: admin | government | officer | analyst (schema.sql
 * user_role enum); the middleware authorizes all four on /api/admin/*.
 */
export async function adminLogin(email, password) {
  const res = await apiFetch('/api/admin/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });

  if (res.ok && res.data) {
    const token = extractToken(res.data);
    if (token) saveToken(token);

    const role = res.data?.user?.role;
    if (role && !['admin', 'government', 'officer', 'analyst'].includes(role)) {
      clearToken();
      return { success: false, message: 'This account does not have admin portal access.' };
    }
    return { success: true, data: res.data, message: res.message };
  }

  return { success: false, status: res.status, message: res.message };
}

// Global bindings for inline handlers / non-module scripts
if (typeof window !== 'undefined') {
  window.getAdminToken = getAdminToken;
  window.setAdminToken = setAdminToken;
  window.clearAdminToken = clearAdminToken;
  window.requireAuth = requireAuth;
  window.adminRequest = adminRequest;
  window.showAdminBanner = showAdminBanner;
  window.adminLogin = adminLogin;
  window.AdminAPI = {
    LOGIN_URL,
    getAdminToken,
    setAdminToken,
    clearAdminToken,
    requireAuth,
    adminRequest,
    showAdminBanner,
    adminLogin,
  };
}

export default {
  LOGIN_URL,
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  requireAuth,
  adminRequest,
  showAdminBanner,
  adminLogin,
};
