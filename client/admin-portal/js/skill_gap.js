/**
 * ============================================================
 * MahaKaushal District Supply vs Demand Gap Map (skill_gap.js)
 * ============================================================
 * - Calls GET /admin/analytics (which now returns a live `sectors` array
 *   computed from real outcome data)
 * - Populates sector supply vs absorbed figures with honest "TBC" handling:
 *   vacancies (demand side) are NOT collected by MahaKaushalya, so the table
 *   shows "TBC — no demand feed" instead of an invented benchmark
 * - Badge logic (per the UI design):
 *   - Unplaced share > 50%: Critical Deficit (red)
 *   - Unplaced share 25-50%: High Deficit (amber)
 *   - otherwise: Balanced
 * - Fixes the previous double-`.then()` chain that prevented live rows from
 *   ever being rendered.
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

document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('table tbody');

  function emptyRow(message) {
    return `<tr><td colspan="6" class="py-10 text-center">
      <span class="material-symbols-outlined text-3xl text-outline block mb-1">troubleshoot</span>
      <span class="font-label-md text-label-md text-on-surface-variant">${esc(message)}</span>
    </td></tr>`;
  }

  // Fetch live skill gap analytics — single promise chain (bug fix)
  adminRequest('/api/admin/analytics')
    .then((response) => {
      if (response && response.success && response.data && Array.isArray(response.data.sectors)) {
        populateSkillGapData(response.data);
      } else if (tbody) {
        tbody.innerHTML = emptyRow('Sector analytics unavailable — the API returned no sector data.');
      }
    })
    .catch(() => {
      if (tbody) {
        tbody.innerHTML = emptyRow(
          'Unable to reach the MahaKaushalya API. Is the backend running on port 5000?'
        );
      }
    });

  /**
   * Populates the sector demand vs supply data containers with live API data
   * @param {Object} data - The analytics data from the server
   */
  function populateSkillGapData(data) {
    const sectors = data.sectors || [];
    if (!tbody || sectors.length === 0) {
      if (tbody) {
        tbody.innerHTML = emptyRow(
          'No outcome data yet. Sector supply analysis appears here once trainees submit outcome reports.'
        );
      }
      return;
    }

    tbody.innerHTML = '';

    sectors.forEach((sector) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-surface-container-low/60 transition-colors';

      const supply = Number(sector.supply || 0);
      const absorbed = Number(sector.absorbed || 0);
      const unplaced = Number(sector.unplacedPool || 0);
      const unplacedPercent = parseFloat(sector.unplacedPercent) || 0;

      // Highlighting rules (demand-side vacancies are not collected — TBC):
      // Unplaced share > 50%: Red badge (Critical Deficit)
      // Unplaced share 25-50%: Amber badge (High Deficit)
      let badgeHtml;
      let actionBtnHtml =
        '<button class="p-1 hover:bg-surface-container-high rounded-DEFAULT text-on-surface-variant" title="Live registry data"><span class="material-symbols-outlined text-[18px]">tune</span></button>';

      if (unplacedPercent > 50) {
        row.classList.add('bg-error-container/10');
        badgeHtml =
          '<span class="inline-flex items-center px-2 py-0.5 rounded-DEFAULT font-label-sm text-[10px] bg-error-container text-on-error-container font-bold uppercase">Critical Deficit</span>';
        actionBtnHtml =
          '<button class="p-1 hover:bg-surface-container-high rounded-DEFAULT text-error" title="Capacity Alert"><span class="material-symbols-outlined text-[18px]">warning</span></button>';
      } else if (unplacedPercent >= 25) {
        row.classList.add('bg-secondary-fixed/20');
        badgeHtml =
          '<span class="inline-flex items-center px-2 py-0.5 rounded-DEFAULT font-label-sm text-[10px] bg-secondary-fixed text-on-secondary-fixed font-bold uppercase">High Deficit</span>';
      } else {
        badgeHtml =
          '<span class="inline-flex items-center px-2 py-0.5 rounded-DEFAULT font-label-sm text-[10px] bg-tertiary-fixed text-on-tertiary-fixed font-bold uppercase">Balanced</span>';
      }

      row.innerHTML = `
        <td class="py-3 px-3">
          <div class="font-label-md text-label-md text-primary font-semibold">${esc(sector.tradeName)}</div>
          <div class="font-label-sm text-[11px] text-on-surface-variant">NSQF TBC • ${esc(sector.cluster || 'Live registry data')}</div>
        </td>
        <td class="py-3 px-3 text-right font-data-mono font-medium" style="font-variant-numeric: tabular-nums;">${supply.toLocaleString('en-IN')}</td>
        <td class="py-3 px-3 text-right font-data-mono font-semibold text-primary" style="font-variant-numeric: tabular-nums;">${absorbed.toLocaleString('en-IN')}</td>
        <td class="py-3 px-3 text-right font-data-mono font-bold text-on-surface-variant" style="font-variant-numeric: tabular-nums;" title="Live vacancies require an employer demand feed which is not integrated (TRD)">TBC</td>
        <td class="py-3 px-3 text-center">${badgeHtml}</td>
        <td class="py-3 px-2 text-right">${actionBtnHtml}</td>
      `;

      tbody.appendChild(row);
    });

    // Update overall KPIs from live data where computable
    if (data.kpis) {
      const kpiContainers = document.querySelectorAll('.font-headline-xl');
      if (kpiContainers.length >= 4) {
        if (data.kpis.unplacedPool !== undefined && data.kpis.unplacedPool !== null) {
          kpiContainers[0].textContent = Number(data.kpis.unplacedPool).toLocaleString('en-IN');
        }
        if (data.kpis.wageGap !== undefined && data.kpis.wageGap !== null) {
          kpiContainers[1].textContent = `${data.kpis.wageGap}%`;
        }
        if (data.kpis.highMismatch !== undefined && data.kpis.highMismatch !== null) {
          kpiContainers[2].textContent = `${data.kpis.highMismatch} Courses`;
        }
        if (data.kpis.unfilledDemand !== undefined && data.kpis.unfilledDemand !== null) {
          kpiContainers[3].textContent = `+${Number(data.kpis.unfilledDemand).toLocaleString('en-IN')}`;
        }
      }
    }
  }
});
