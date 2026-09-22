/**
 * ============================================================
 * MahaKaushal District & Outcome Analytics Reports (analytics.js)
 * ============================================================
 * - Calls GET /admin/analytics and populates the cohort table + category
 *   breakdowns from LIVE data only (static demo rows are cleared on load)
 * - Export buttons download real server-side CSV exports of the trainee /
 *   outcome registers
 * - The "Schedule" button honestly reports that scheduled reporting is not
 *   implemented (PRD non-goal for this release)
 * - Global window.triggerToast for inline onclick handlers
 * ============================================================
 */

import { adminRequest, showAdminBanner } from './adminApi.js';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global toast trigger function for telemetry and inline dismissals
window.triggerToast = function (message) {
  const toast = document.getElementById('toast-export');
  if (!toast) return;

  if (message) {
    const textContainer =
      toast.querySelector('.text-primary-fixed-dim') || toast.querySelector('.font-bold');
    if (textContainer) textContainer.textContent = message;
  }
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 5000);
};

document.addEventListener('DOMContentLoaded', () => {
  const tbodyTarget = document.querySelectorAll('table');
  const cohortTable = tbodyTarget.length > 1 ? tbodyTarget[1] : tbodyTarget[0];
  const cohortTbody = cohortTable ? cohortTable.querySelector('tbody') : null;

  function emptyRow(message) {
    return `<tr><td colspan="11" class="py-10 text-center">
      <span class="material-symbols-outlined text-3xl text-outline block mb-1">insights</span>
      <span class="font-label-md text-label-md text-on-surface-variant">${esc(message)}</span>
    </td></tr>`;
  }

  // 1. Fetch live analytics overview
  if (cohortTbody) {
    cohortTbody.innerHTML = `<tr><td colspan="11" class="py-8 text-center text-on-surface-variant font-label-md">
      <span class="material-symbols-outlined animate-spin align-middle mr-1">progress_activity</span>
      Loading cohort analytics…
    </td></tr>`;
  }

  adminRequest('/api/admin/analytics')
    .then((res) => {
      if (!res || !res.success || !res.data) {
        if (cohortTbody) cohortTbody.innerHTML = emptyRow((res && res.message) || 'Failed to load analytics.');
        return;
      }

      const data = res.data;

      // Map the backend's placementByTrade into the cohort-row shape.
      const cohorts = (data.placementByTrade || []).map((t) => ({
        cohortId: t.trade,
        program: t.trade,
        partner: '—',
        enrolled: t.totalOutcomes,
        assessed: t.totalOutcomes,
        placed: t.placed,
        placementRate: t.placementRate,
      }));

      if (!cohorts.length) {
        if (cohortTbody) {
          cohortTbody.innerHTML = emptyRow(
            'No outcome data yet. Cohort analytics appear here once trainees submit outcome reports.'
          );
        }
      } else {
        populateDistrictOutcomes(cohorts);
      }

      const sd = data.statusDistribution || {};
      const total = data.totalOutcomes || 0;
      const pct = (n) => (total > 0 ? Math.round(((sd[n] || 0) / total) * 1000) / 10 : 0);
      populateCategoryBreakdowns({
        wageEmployment: pct('employed'),
        selfEmployment: pct('self_employed'),
        higherEducation: pct('higher_studies'),
      });

      // Salary distribution widgets (min/max/avg/median) if present
      const sd2 = data.salaryDistribution || {};
      if (sd2.count) {
        const salaryLabels = [
          ['median', sd2.median],
          ['average', sd2.average],
          ['max', sd2.max],
        ];
        document.querySelectorAll('.font-headline-xl, .font-headline-md').forEach((el) => {
          const txt = el.textContent.trim();
          salaryLabels.forEach(([key, val]) => {
            if (new RegExp(`^${key}\\s*₹`, 'i').test(txt) && val) {
              el.textContent = `₹${Number(val).toLocaleString('en-IN')}`;
            }
          });
        });
      }
    })
    .catch(() => {
      if (cohortTbody) {
        cohortTbody.innerHTML = emptyRow(
          'Unable to reach the MahaKaushalya API. Is the backend running on port 5000?'
        );
      }
    });

  /**
   * Populates district outcome comparison tables with API data
   */
  function populateDistrictOutcomes(cohorts) {
    if (!cohorts || !Array.isArray(cohorts) || cohorts.length === 0 || !cohortTbody) return;

    cohortTbody.innerHTML = '';

    cohorts.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.className = `transition-colors hover:bg-surface-container-low/60 ${idx % 2 === 1 ? 'bg-surface-container-low/30' : ''}`;

      const enrolled = Number(item.enrolled || 0).toLocaleString('en-IN');
      const assessed = Number(item.assessed || item.certified || 0).toLocaleString('en-IN');
      const placed = Number(item.placed || 0).toLocaleString('en-IN');
      const placementPct = item.placementRate || '—';

      tr.innerHTML = `
        <td class="py-3 px-space-md">
          <div class="font-semibold text-primary">${esc(item.cohortId || `MH-PUN-${idx + 1}`)}</div>
          <div class="font-label-sm text-[11px] text-on-surface-variant">${esc(item.program || item.trade || 'Vocational Skilling Program')}</div>
        </td>
        <td class="py-3 px-space-md">
          <div class="text-on-surface font-medium">${esc(item.partner || item.center || 'MSSDS Training Center')}</div>
          <div class="font-label-sm text-[11px] text-on-surface-variant font-data-mono">Trade cohort</div>
        </td>
        <td class="py-3 px-space-md font-data-mono" style="font-variant-numeric: tabular-nums;">${enrolled}</td>
        <td class="py-3 px-space-md font-data-mono" style="font-variant-numeric: tabular-nums;">${assessed}</td>
        <td class="py-3 px-space-md font-data-mono font-bold text-primary" style="font-variant-numeric: tabular-nums;">${placed}</td>
        <td class="py-3 px-space-md">
          <span class="px-2 py-0.5 rounded bg-surface-container-high text-primary font-bold font-data-mono text-label-sm" style="font-variant-numeric: tabular-nums;">${esc(placementPct)}</span>
        </td>
        <td class="py-3 px-space-md font-data-mono font-semibold text-on-surface-variant" style="font-variant-numeric: tabular-nums;">—</td>
        <td class="py-3 px-space-md font-data-mono font-semibold text-on-surface-variant" style="font-variant-numeric: tabular-nums;">—</td>
        <td class="py-3 px-space-md font-data-mono font-bold text-secondary" style="font-variant-numeric: tabular-nums;">—</td>
        <td class="py-3 px-space-md text-center">
          <span class="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-bold">Live Registry</span>
        </td>
        <td class="py-3 px-space-md text-right">
          <button class="p-1.5 rounded hover:bg-surface-container-high text-primary transition-colors" title="Download Summary CSV" onclick="window.location.href='/api/admin/export/outcomes.csv'">
            <span class="material-symbols-outlined text-[18px]">download</span>
          </button>
        </td>
      `;

      cohortTbody.appendChild(tr);
    });
  }

  /**
   * Populates category breakdown percentages
   * (Wage Employment vs Self-Employment vs Higher Education)
   */
  function populateCategoryBreakdowns(categories) {
    if (!categories) return;

    const wageVal = categories.wageEmployment;
    const selfVal = categories.selfEmployment;
    const higherVal = categories.higherEducation;

    const labels = document.querySelectorAll('.font-headline-md, .font-headline-xl, span');
    labels.forEach((el) => {
      const text = el.textContent.toLowerCase();
      if (text.includes('wage employment') && el.nextElementSibling && wageVal !== undefined) {
        el.nextElementSibling.textContent = `${wageVal}%`;
      } else if (text.includes('self-employment') && el.nextElementSibling && selfVal !== undefined) {
        el.nextElementSibling.textContent = `${selfVal}%`;
      } else if (text.includes('higher education') && el.nextElementSibling && higherVal !== undefined) {
        el.nextElementSibling.textContent = `${higherVal}%`;
      }
    });
  }

  // 2. Wire Export & Schedule Buttons — REAL CSV downloads; scheduled reports
  // are not implemented (PRD non-goal) and say so.
  const exportBtn = document.getElementById('btn-export-excel');
  const scheduleBtn = document.getElementById('btn-schedule');
  const quickDownloadBtn = document.getElementById('btn-quick-download');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.triggerToast('Downloading outcomes register (CSV)…');
      showAdminBanner('Downloading the outcomes register as CSV (opens in Excel).', 'success');
      window.location.href = '/api/admin/export/outcomes.csv';
    });
  }

  if (quickDownloadBtn) {
    quickDownloadBtn.addEventListener('click', () => {
      window.triggerToast('Downloading trainee register (CSV)…');
      showAdminBanner('Downloading the trainee register as CSV.', 'success');
      window.location.href = '/api/admin/export/trainees.csv';
    });
  }

  if (scheduleBtn) {
    scheduleBtn.addEventListener('click', () => {
      window.triggerToast('Scheduled reporting is not implemented in this release (PRD non-goal).');
      showAdminBanner('Scheduled reporting is not implemented in this release — use the CSV export instead.', 'info');
    });
  }
});
