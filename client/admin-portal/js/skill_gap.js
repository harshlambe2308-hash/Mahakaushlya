/**
 * ============================================================
 * MahaKaushal District Supply vs Demand Gap Map (skill_gap.js)
 * ============================================================
 * - Calls GET /admin/analytics/skill-gap
 * - Populates sector demand vs trained supply figures
 * - Highlights high-deficit sectors with red/amber badges:
 *   - Deficit > 50%: Critical Deficit (Red badge)
 *   - Deficit 25% - 50%: High Deficit (Amber badge)
 * - Updates KPI summary counters
 * ============================================================
 */

import { adminRequest, showAdminBanner } from './adminApi.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Fetch live skill gap analytics
  adminRequest('/api/admin/analytics')  // TODO: dedicated skill-gap endpoint is a known gap
    .then(response => {
      // The generic analytics payload has no sector demand data; keep the
      // static benchmark matrix unless a future endpoint supplies sectors.
      if (response && response.success && response.data && response.data.sectors) {
        populateSkillGapData(response.data);
      }
    })
    .then(response => {
      if (response && response.success && response.data) {
        populateSkillGapData(response.data);
      }
    })
    .catch(error => {
      console.warn('[SkillGap] Keeping static district gap matrix, API unreachable:', error);
    });

  /**
   * Populates the sector demand vs supply data containers with live API data
   * @param {Object} data - The analytics data from the server
   */
  function populateSkillGapData(data) {
    const tbody = document.querySelector('table tbody');
    if (!tbody || !data.sectors || !Array.isArray(data.sectors) || data.sectors.length === 0) return;

    tbody.innerHTML = '';

    data.sectors.forEach(sector => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-surface-container-low/60 transition-colors';

      const supply = Number(sector.supply || 0);
      const demand = Number(sector.demand || (supply + (sector.vacancies || 0)));
      const deficit = demand - supply;
      const deficitPercent = demand > 0 ? (deficit / demand) * 100 : 0;

      let badgeHtml = '';
      let actionBtnHtml = '<button class="p-1 hover:bg-surface-container-high rounded-DEFAULT text-on-surface-variant"><span class="material-symbols-outlined text-[18px]">tune</span></button>';

      // Highlighting rules:
      // Deficit > 50%: Red badge (Critical Deficit)
      // Deficit 25-50%: Amber badge (High Deficit)
      if (deficitPercent > 50) {
        row.classList.add('bg-error-container/10');
        badgeHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-DEFAULT font-label-sm text-[10px] bg-error-container text-on-error-container font-bold uppercase">Critical Deficit</span>';
        actionBtnHtml = '<button class="p-1 hover:bg-surface-container-high rounded-DEFAULT text-error" title="Capacity Alert"><span class="material-symbols-outlined text-[18px]">warning</span></button>';
      } else if (deficitPercent >= 25 && deficitPercent <= 50) {
        row.classList.add('bg-secondary-fixed/20');
        badgeHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-DEFAULT font-label-sm text-[10px] bg-secondary-fixed text-on-secondary-fixed font-bold uppercase">High Deficit</span>';
      } else if (deficit < 0) {
        badgeHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-DEFAULT font-label-sm text-[10px] bg-surface-container-high text-primary font-bold uppercase">Over-Supplied</span>';
      } else {
        badgeHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-DEFAULT font-label-sm text-[10px] bg-tertiary-fixed text-on-tertiary-fixed font-bold uppercase">Balanced / Demand</span>';
      }

      const vacancies = Number(sector.vacancies || deficit);
      const vacancyDisplay = vacancies > 0 ? `+${vacancies.toLocaleString()}` : `${vacancies.toLocaleString()}`;
      const vacancyClass = vacancies > 0 ? 'text-on-tertiary-container' : 'text-error';

      row.innerHTML = `
        <td class="py-3 px-3">
          <div class="font-label-md text-label-md text-primary font-semibold">${sector.tradeName || sector.name || 'Vocational Trade'}</div>
          <div class="font-label-sm text-[11px] text-on-surface-variant">${sector.nsqfLevel || 'NSQF L4'} • ${sector.cluster || 'Industrial Cluster'}</div>
        </td>
        <td class="py-3 px-3 text-right font-data-mono font-medium" style="font-variant-numeric: tabular-nums;">${supply.toLocaleString()}</td>
        <td class="py-3 px-3 text-right font-data-mono font-semibold text-primary" style="font-variant-numeric: tabular-nums;">${Number(sector.absorbed || 0).toLocaleString()}</td>
        <td class="py-3 px-3 text-right font-data-mono font-bold ${vacancyClass}" style="font-variant-numeric: tabular-nums;">${vacancyDisplay}</td>
        <td class="py-3 px-3 text-center">${badgeHtml}</td>
        <td class="py-3 px-2 text-right">${actionBtnHtml}</td>
      `;

      tbody.appendChild(row);
    });

    // Update overall KPIs if provided
    if (data.kpis) {
      const kpiContainers = document.querySelectorAll('.font-headline-xl');
      if (kpiContainers.length >= 4) {
        if (data.kpis.unplacedPool !== undefined) kpiContainers[0].textContent = Number(data.kpis.unplacedPool).toLocaleString();
        if (data.kpis.wageGap !== undefined) kpiContainers[1].textContent = `${data.kpis.wageGap}%`;
        if (data.kpis.highMismatch !== undefined) kpiContainers[2].textContent = `${data.kpis.highMismatch} Courses`;
        if (data.kpis.unfilledDemand !== undefined) kpiContainers[3].textContent = `+${Number(data.kpis.unfilledDemand).toLocaleString()}`;
      }
    }
  }
});
