/**
 * ============================================================================
 * MahaKaushal Trainee Portal — route guard (guard.js)
 * ============================================================================
 * Trainee-only authentication guard. Loaded synchronously in <head> (regular
 * script, NO defer/async) of every PROTECTED trainee page so it runs BEFORE
 * the page paints. Unauthenticated visitors never see the protected shell —
 * they are redirected to the Trainee Login page immediately.
 *
 * Public trainee pages (Landing index.html, trainee_login.html,
 * trainee_registration.html) deliberately do NOT include this file.
 *
 * The token/role storage is read directly (same localStorage key as
 * shared/auth.js) so this script stays dependency-free and synchronous —
 * ES modules would defer execution until after first paint.
 *
 * Redirect safety:
 * - history.replaceState is used when the guard bounces a request that has no
 *   history entry worth preserving (i.e. it never became a real page view).
 *   Browsers do not create a usable history entry for pages that redirect in
 *   <head> before paint, so back/forward behavior is unaffected.
 * - Officer (admin) tokens are also bounced: the trainee portal is trainee-
 *   only. Admin portal behavior is NOT touched by this file.
 * ============================================================================
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'mahakaushalya_token';

  function readToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  /** Parse the JWT payload (null when absent/unparseable). */
  function decodeRole(token) {
    try {
      var payload = JSON.parse(atob((token || '').split('.')[1] || 'e30='));
      return payload && payload.role ? payload.role : null;
    } catch (e) {
      return null;
    }
  }

  var OFFICER_ROLES = ['admin', 'government', 'officer', 'analyst'];

  function isOfficer(role) {
    return OFFICER_ROLES.indexOf(role) !== -1;
  }

  /**
   * Evaluate the session and redirect if it must not be here.
   * Runs before first paint of the protected page.
   */
  function enforce() {
    var token = readToken();

    if (!token) {
      // No session at all -> straight to the Trainee Login page.
      window.location.replace('trainee_login.html');
      return;
    }

    // Wrong-portal token: Government/officer accounts must use the Admin
    // Portal. Clear the token and send the visitor to the Trainee Login.
    if (isOfficer(decodeRole(token))) {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch (e) {
        /* ignore */
      }
      window.location.replace('trainee_login.html');
      return;
    }

    // A trainee token is present. Depth validation (expiry, signature) is the
    // backend's job: any protected API call will 401 and shared/auth.js will
    // clear the token and redirect to this portal's login page.
  }

  enforce();
})();
