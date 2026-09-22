/**
 * ============================================================
 * MahaKaushal Admin Portal — Overview Dashboard (dashboard.js)
 * ============================================================
 * - Session guard: pages behind the admin shell require a token; without one
 *   the user is redirected to the admin login (previous behavior rendered the
 *   static shell and let API calls fail — flagged in brain.md as a gotcha).
 * - Calls GET /admin/overview and populates KPI cards with live data
 * - "Batch Authorize Placements" calls POST /api/admin/outcomes/batch-verify
 *   (real route) with the pending outcomes currently listed server-side
 * - Export button downloads the real outcomes CSV export
 * - Adds the Sign out action to the officer identity block
 * ============================================================
 */

import { adminRequest, showAdminBanner, clearAdminToken } from './adminApi.js';
import { isLoggedIn } from '../../shared/auth.js';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global actions for inline handlers
window.exportDivisionalReport = function () {
  // Real export: server-side CSV of the outcomes register.
  showAdminBanner('Preparing outcomes CSV export…', 'info');
  window.location.href = '/api/admin/export/outcomes.csv';
};

window.batchAuthorizePlacements = function () {
  const confirmed = window.confirm(
    'Batch-verify ALL currently pending outcome claims as verified?\n\nThis is a one-time decision per claim and cannot be undone.'
  );
  if (!confirmed) return;

  showAdminBanner('Batch authorizing pending placements…', 'info');

  adminRequest('/api/admin/outcomes', { params: { verificationStatus: 'pending', limit: 200, page: 1 } })
    .then(async (listRes) => {
      const ids = (listRes?.data?.outcomes || []).map((o) => o.id).filter(Boolean);
      if (!ids.length) {
        showAdminBanner('No pending outcomes found to authorize.', 'info');
        return;
      }
      const res = await adminRequest('/api/admin/outcomes/batch-verify', {
        method: 'POST',
        body: { outcomeIds: ids, decision: 'verified', remarks: 'Batch authorized from executive cockpit' },
      });
      if (res && res.success) {
        showAdminBanner(
          `${res.data?.verified ?? 0} outcome(s) verified, ${res.data?.failed ?? 0} skipped. Analytics will reflect the decisions immediately.`,
          'success'
        );
      } else {
        showAdminBanner((res && res.message) || 'Batch authorization failed.', 'error');
      }
    })
    .catch(() => showAdminBanner('Batch authorization request failed — check the API connection.', 'error'));
};

document.addEventListener('DOMContentLoaded', async () => {
  // --- Session guard (fixes the "renders broken shell when logged out" gotcha)
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  // --- Fetch live KPI data
  try {
    const response = await adminRequest('/api/admin/overview');
    if (!response || !response.success || !response.data) {
      if (response && response.message) {
        showAdminBanner(response.message, 'error');
      }
      return;
    }

    const data = response.data;

    // Populate KPI summary cards
    const cards = document.querySelectorAll('.font-headline-xl');
    cards.forEach((card) => {
      const container = card.closest('.bg-surface-container-lowest') || card.parentElement;
      if (!container) return;

      const labelEl =
        container.querySelector('.uppercase.tracking-wider') ||
        container.querySelector('label') ||
        container.querySelector('span');
      const labelText = (labelEl ? labelEl.textContent : '').toLowerCase();

      card.style.fontVariantNumeric = 'tabular-nums';

      if (labelText.includes('enrolled') && data.totalEnrolled !== undefined) {
        card.textContent = Number(data.totalEnrolled).toLocaleString('en-IN');
      } else if (labelText.includes('certified') && !labelText.includes('wage') && data.certifiedTrainees !== undefined) {
        card.textContent = Number(data.certifiedTrainees).toLocaleString('en-IN');
      } else if (labelText.includes('placement') && !labelText.includes('pending') && data.reportedPlacements !== undefined) {
        card.textContent = Number(data.reportedPlacements).toLocaleString('en-IN');
      } else if (labelText.includes('retention') && data.retentionRate !== undefined) {
        // retentionRate is null until a scheduled retention job exists (TRD).
        // Render an honest em-dash instead of a fabricated "null%".
        card.textContent = data.retentionRate === null ? '—' : `${data.retentionRate}%`;
        const note = container.querySelector('[data-retention-note]');
        if (note) note.textContent = '3/6/12-month cohort tracking pending (TBC)';
      } else if (labelText.includes('pending') && data.pendingVerifications !== undefined) {
        card.textContent = Number(data.pendingVerifications).toLocaleString('en-IN');
      } else if (labelText.includes('wage') && data.avgWage !== undefined) {
        card.innerHTML =
          data.avgWage === null
            ? '—'
            : `₹${Number(data.avgWage).toLocaleString('en-IN')}<span class="font-body-sm text-[14px] text-on-surface-variant">/mo</span>`;
      }
    });

    // Render placement distribution bars using live data
    if (data.placementDistribution && Array.isArray(data.placementDistribution)) {
      const monthRows = document.querySelectorAll('.h-6.w-full.bg-surface-container');
      monthRows.forEach((row, index) => {
        const item = data.placementDistribution[index];
        if (!item) return;

        const containerParent = row.parentElement;
        if (containerParent) {
          const monthLabel = containerParent.querySelector('.font-bold');
          const statsLabel = containerParent.querySelector('.font-data-mono');
          if (monthLabel && item.month) monthLabel.textContent = item.month;
          if (statsLabel && item.statsText) statsLabel.textContent = item.statsText;
        }

        if (item.bars && Array.isArray(item.bars)) {
          row.innerHTML = '';
          item.bars.forEach((bar) => {
            const barEl = document.createElement('div');
            barEl.className = `h-full ${bar.colorClass || 'bg-primary'}`;
            barEl.style.width = `${bar.percent}%`;
            row.appendChild(barEl);
          });
        } else if (item.percent !== undefined) {
          row.innerHTML = `<div class="h-full bg-secondary" style="width: ${item.percent}%;"></div>`;
        }
      });
    }
  } catch (err) {
    console.warn('[Dashboard] overview load failed:', err);
    showAdminBanner('Unable to reach the MahaKaushalya API. Is the backend running on port 5000?', 'error');
  }

  // --- Sidebar active navigation highlighting
  const nav = document.querySelector('nav[data-active-classes]');
  if (nav) {
    const activeClassesStr = nav.getAttribute('data-active-classes');
    const activeClasses = activeClassesStr ? activeClassesStr.split(' ') : [];
    const links = nav.querySelectorAll('a[data-path]');
    const currentPath = window.location.pathname;

    links.forEach((link) => {
      const path = link.getAttribute('data-path');
      const isCurrent =
        currentPath.includes(path) ||
        (path === 'overview' &&
          (currentPath.endsWith('/') || currentPath.endsWith('index.html') || !currentPath.includes('.html')));

      if (isCurrent) {
        activeClasses.forEach((cls) => cls && link.classList.add(cls));
        link.classList.remove('text-surface-variant');
      } else {
        activeClasses.forEach((cls) => cls && link.classList.remove(cls));
        link.classList.add('text-surface-variant');
      }
    });
  }

  // --- Wire action buttons
  document.querySelectorAll('button').forEach((btn) => {
    const text = btn.textContent.trim();
    if (text.includes('Export Divisional Report')) {
      btn.onclick = window.exportDivisionalReport;
    } else if (text.includes('Batch Authorize Placements')) {
      btn.onclick = window.batchAuthorizePlacements;
    }
  });

  // --- Officer identity block: show the signed-in email + Sign out action
  const identityHost = Array.from(document.querySelectorAll('header .flex.flex-col.text-right')).pop();
  if (identityHost && !document.getElementById('admin-session-badge')) {
    const badge = document.createElement('div');
    badge.id = 'admin-session-badge';
    badge.className = 'flex items-center gap-2 mt-0.5 justify-end';
    badge.innerHTML = `
      <span id="admin-session-email" class="font-label-sm text-[10px] text-on-surface-variant truncate max-w-[160px]"></span>
      <button id="admin-logout-btn" class="font-label-sm text-[10px] font-bold text-error hover:underline flex items-center gap-0.5" title="End session and clear the token from this browser">
        <span class="material-symbols-outlined text-[13px]">logout</span> Sign out
      </button>`;
    identityHost.appendChild(badge);

    // Show the logged-in identity (JWT payload email, no extra API call)
    try {
      const token = localStorage.getItem('mahakaushalya_token') || '';
      const payload = JSON.parse(atob(token.split('.')[1] || 'e30='));
      const emailEl = document.getElementById('admin-session-email');
      if (emailEl && payload.email) emailEl.textContent = payload.email;
    } catch {
      /* non-fatal */
    }

    document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
      clearAdminToken();
      window.location.href = 'login.html';
    });
  }
});
