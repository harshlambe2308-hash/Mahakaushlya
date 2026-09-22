/**
 * ============================================================
 * MahaKaushal Employer Placement Validation Portal (validation.js)
 * ============================================================
 * STATUS: The employer validation backend is an explicit PRD non-goal for
 * this release (MahaKaushalya_PRD §4 "Non-Goals" — "Employer self-service
 * validation portal … no backend, authentication, or token workflow is in
 * scope"). This page therefore:
 *   1. Checks whether a magic-link token is present (?token=...)
 *   2. Probes GET /api/public/employers/verify-token so the integration point
 *      is real and will light up the moment the backend ships
 *   3. Renders a clear "not yet available" banner instead of fake success
 *      toasts, and disables the decision buttons until the backend exists
 * No invented candidate data is displayed.
 * ============================================================
 */

import { adminRequest, showAdminBanner } from './adminApi.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  // Locate the page's decision buttons by their visible labels
  let approveBtn = null;
  let flagBtn = null;
  document.querySelectorAll('button').forEach((btn) => {
    const text = btn.textContent.trim();
    if (text.includes('Approve Placement')) approveBtn = btn;
    else if (text.includes('Flag Suspicious')) flagBtn = btn;
  });

  function gateButtons(reason) {
    [approveBtn, flagBtn].forEach((btn) => {
      if (!btn) return;
      btn.disabled = true;
      btn.classList.add('opacity-40', 'cursor-not-allowed');
      btn.title = reason;
    });
  }

  function renderUnavailableBanner(detail) {
    showAdminBanner(
      'Employer validation is not available in this release. The employer validation backend is a documented future-scope item (PRD §4) — no validation tokens can be issued or consumed yet.',
      'info'
    );
  }

  // Replace any static demo candidate summary with an honest placeholder
  function clearDemoCandidateDetails() {
    const spans = document.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      if (spans[i].textContent.includes('Candidate:')) {
        spans[i].textContent = 'Candidate: — (awaiting backend integration — no token-secured candidate feed exists yet)';
        break;
      }
    }
  }

  if (token) {
    // Probe the (future) backend so the integration point is real.
    adminRequest(`/api/public/employers/verify-token?token=${encodeURIComponent(token)}`)
      .then((response) => {
        if (response && response.success && response.data) {
          populateCandidateDetails(response.data);
          showAdminBanner('Candidate placement record retrieved successfully.', 'success');
        } else {
          clearDemoCandidateDetails();
          gateButtons('Awaiting employer validation backend (future scope).');
          renderUnavailableBanner();
        }
      })
      .catch(() => {
        clearDemoCandidateDetails();
        gateButtons('Awaiting employer validation backend (future scope).');
        renderUnavailableBanner();
      });
  } else {
    clearDemoCandidateDetails();
    gateButtons('Awaiting employer validation backend (future scope).');
    renderUnavailableBanner();
  }

  function populateCandidateDetails(candidate) {
    const spans = document.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      if (spans[i].textContent.includes('Candidate:')) {
        const salaryText = candidate.claimed_salary || candidate.salary || '—';
        const role = candidate.designation || candidate.role || '—';
        const name = candidate.name || candidate.traineeName || '—';
        const id = candidate.schemeId || candidate.uid || '—';
        spans[i].textContent = `Candidate: ${name} (${id}) • Role: ${role} • Salary: ${salaryText}`;
        break;
      }
    }
  }

  // Submission attempt — kept wired to the future endpoint, but clearly
  // reports that the backend does not exist rather than faking success.
  async function submitValidation(decision) {
    if (!token) {
      showAdminBanner('No validation token present. Employer validation links are issued by a future backend integration.', 'error');
      return;
    }

    const textarea = document.querySelector('textarea');
    const remarks = textarea ? textarea.value.trim() : '';

    showAdminBanner(`Submitting employer ${decision} validation…`, 'info');

    try {
      const res = await adminRequest('/api/public/employers/validate', {
        method: 'POST',
        body: {
          token,
          decision, // 'Approved' | 'Flagged'
          salary_confirmed: decision === 'Approved',
          reason: remarks,
          verified_at: new Date().toISOString(),
        },
      });

      if (res && res.success) {
        showAdminBanner(`Placement claim recorded as ${decision}. Statutory compliance captured.`, 'success');
        if (approveBtn) approveBtn.disabled = true;
        if (flagBtn) flagBtn.disabled = true;
      } else {
        showAdminBanner(
          (res && res.message) ||
            'The employer validation backend is not available in this release (PRD future scope). No record was created.',
          'error'
        );
      }
    } catch {
      showAdminBanner(
        'The employer validation backend is not available in this release (PRD future scope). No record was created.',
        'error'
      );
    }
  }

  if (approveBtn) {
    approveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      submitValidation('Approved');
    });
  }

  if (flagBtn) {
    flagBtn.addEventListener('click', (e) => {
      e.preventDefault();
      submitValidation('Flagged');
    });
  }
});
