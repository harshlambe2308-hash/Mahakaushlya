/**
 * ============================================================
 * MahaKaushal Training Provider Performance Rankings (provider.js)
 * ============================================================
 * - Calls GET /admin/analytics and builds the ranking table from LIVE
 *   placementByCenter data only. The former hardcoded six-provider demo
 *   dataset was replaced: demo values (retention, wage growth, head of
 *   training, grades) are not tracked by any MahaKaushalya entity, so those
 *   columns render an honest "—" and grades/status are derived from the
 *   live placement percentage as designed.
 * - Adds client-side table column sorting (by Placement % or Rating)
 * - Global window.vtpData and window.selectVTP(index) for inline
 *   onclick inspector selection
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

// Global data store — populated from the live analytics endpoint
window.vtpData = [];

// Global row selection for inspector card called by inline onclick="selectVTP(n)"
window.selectVTP = function (index) {
  const item = window.vtpData[index];
  if (!item) return;

  const nameEl = document.getElementById('inspector-name');
  const locEl = document.getElementById('inspector-loc');
  if (nameEl) nameEl.textContent = item.name;
  if (locEl) locEl.textContent = item.loc || item.fullLoc;

  const rows = document.querySelectorAll('#vtp-table-body tr');
  rows.forEach((r, idx) => {
    if (idx === index) {
      r.classList.add('bg-surface-container-low/60');
    } else {
      r.classList.remove('bg-surface-container-low/60');
    }
  });
};

function renderTable() {
  const tbody = document.getElementById('vtp-table-body');
  if (!tbody) return;

  if (!window.vtpData.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-10 text-center">
      <span class="material-symbols-outlined text-3xl text-outline block mb-1">military_tech</span>
      <span class="font-label-md text-label-md text-on-surface-variant">No training-center outcome data yet. Rankings appear here once trainees submit outcome reports.</span>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = '';

  window.vtpData.forEach((vtp, i) => {
    let gradeBadge = '';
    if (vtp.grade.includes('A+')) {
      gradeBadge = '<span class="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed font-bold font-data-mono text-[11px] rounded-DEFAULT">A+</span>';
    } else if (vtp.grade.includes('A')) {
      gradeBadge = '<span class="px-2 py-0.5 bg-surface-container-highest text-primary font-bold font-data-mono text-[11px] rounded-DEFAULT">A</span>';
    } else if (vtp.grade.includes('B')) {
      gradeBadge = '<span class="px-2 py-0.5 bg-surface-container-highest text-primary font-bold font-data-mono text-[11px] rounded-DEFAULT">B</span>';
    } else {
      gradeBadge = '<span class="px-2 py-0.5 bg-error-container text-error font-bold font-data-mono text-[11px] rounded-DEFAULT">C</span>';
    }

    let statusBadge = '';
    if (vtp.status === 'Clean') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-tertiary-fixed/30 text-on-tertiary-container text-[11px] font-semibold rounded"><span class="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span> Clean</span>';
    } else if (vtp.status === 'Show-Cause') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-error-container text-error text-[11px] font-semibold rounded"><span class="material-symbols-outlined text-[13px]">warning</span> Show-Cause</span>';
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold rounded"><span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> ${esc(vtp.status)}</span>`;
    }

    const isLow = vtp.placement < 50;
    const placementColor = isLow ? 'text-error' : 'text-primary';
    const barBg = isLow ? 'bg-error' : 'bg-primary';

    // Star rating rendering
    const starCount = vtp.stars || (vtp.placement > 85 ? 5 : vtp.placement > 70 ? 4 : vtp.placement > 50 ? 3 : 2);
    let starsHtml = '';
    for (let s = 0; s < 5; s++) {
      starsHtml += `<span class="material-symbols-outlined text-[13px] ${s < starCount ? 'text-secondary' : 'text-outline-variant'}">star</span>`;
    }

    const rowClass = vtp.placement < 40
      ? 'hover:bg-error-container/20 transition-colors bg-error-container/10 cursor-pointer'
      : 'hover:bg-surface-container-low/60 transition-colors cursor-pointer';

    const countDisplay = Number(vtp.count || 0).toLocaleString('en-IN');
    const initials = vtp.initials || (vtp.name ? vtp.name.substring(0, 2).toUpperCase() : 'TP');

    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.onclick = () => window.selectVTP(i);

    tr.innerHTML = `
      <td class="py-3 px-space-sm">
        <div class="flex items-center gap-space-sm">
          <div class="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0">${esc(initials)}</div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-label-md text-primary font-bold truncate">${esc(vtp.name)}</span>
            <span class="font-data-mono text-[11px] text-on-surface-variant">${esc(vtp.code)} • ${esc(vtp.loc)}</span>
          </div>
        </div>
      </td>
      <td class="py-3 px-space-xs text-center">${gradeBadge}</td>
      <td class="py-3 px-space-xs text-right font-data-mono font-medium" style="font-variant-numeric: tabular-nums;">${countDisplay}</td>
      <td class="py-3 px-space-xs text-right">
        <span class="font-data-mono font-bold ${placementColor}" style="font-variant-numeric: tabular-nums;">${vtp.placement}%</span>
        <div class="w-14 bg-surface-container rounded-full h-1 inline-block ml-1 align-middle">
          <div class="${barBg} h-full rounded-full" style="width: ${vtp.placement}%;"></div>
        </div>
      </td>
      <td class="py-3 px-space-xs text-center">
        <div class="flex items-center justify-center">${starsHtml}</div>
      </td>
      <td class="py-3 px-space-xs text-right font-data-mono font-semibold text-outline" style="font-variant-numeric: tabular-nums;" title="Retention tracking is not implemented (TRD)">—</td>
      <td class="py-3 px-space-xs text-center">${statusBadge}</td>
      <td class="py-3 px-space-sm text-right" onclick="event.stopPropagation();">
        <button class="p-1 hover:bg-surface-container text-primary rounded transition-colors" title="Audit Dossier" onclick="window.selectVTP(${i});">
          <span class="material-symbols-outlined text-[18px]">description</span>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  let sortKey = null;
  let sortAsc = false;

  // 1. Setup client-side column header sorting
  const ths = document.querySelectorAll('th');
  ths.forEach((th) => {
    th.style.cursor = 'pointer';
    th.title = 'Click to sort';

    th.addEventListener('click', () => {
      const headerText = th.textContent.toLowerCase();
      let key = null;

      if (headerText.includes('placement')) key = 'placement';
      else if (headerText.includes('rating') || headerText.includes('star') || headerText.includes('grade')) key = 'stars';
      else if (headerText.includes('trained') || headerText.includes('count')) key = 'count';

      if (!key) return;

      if (sortKey === key) {
        sortAsc = !sortAsc;
      } else {
        sortKey = key;
        sortAsc = false;
      }

      window.vtpData.sort((a, b) => {
        const valA = a[key] !== undefined ? a[key] : 0;
        const valB = b[key] !== undefined ? b[key] : 0;
        return sortAsc ? valA - valB : valB - valA;
      });

      renderTable();
      window.selectVTP(0);
      showAdminBanner(`Sorted by ${key.toUpperCase()} (${sortAsc ? 'Ascending' : 'Descending'})`, 'info');
    });
  });

  // 2. Fetch live provider rankings (LIVE data only — no static fallback dataset)
  renderTable();
  adminRequest('/api/admin/analytics')
    .then((res) => {
      if (!res || !res.success || !res.data) return;
      const byCenter = res.data.placementByCenter || [];
      const rows = byCenter.map((c, idx) => {
        const pct = Number.parseFloat(c.placementRate) || 0;
        return {
          name: c.center,
          code: `MH-CENTER-${String(idx + 1).padStart(3, '0')}`,
          loc: c.center || 'Maharashtra',
          head: '—',
          grade: pct >= 85 ? 'GRADE A+' : pct >= 60 ? 'GRADE B' : 'GRADE C',
          count: c.totalOutcomes,
          placement: pct,
          retention: null,
          wageGrowth: null,
          status: pct >= 40 ? 'Clean' : 'Review',
          stars: Math.max(1, Math.min(5, Math.round(pct / 20))),
          initials: (c.center || 'TP').substring(0, 2).toUpperCase(),
        };
      });
      if (rows.length > 0) {
        window.vtpData = rows;
        renderTable();
        window.selectVTP(0);
        showAdminBanner('Live training-center rankings loaded from the outcome registry.', 'success');
      }
    })
    .catch((err) => {
      console.warn('[Provider] analytics unavailable:', err);
      showAdminBanner('Unable to reach the MahaKaushalya API — rankings unavailable.', 'error');
    });
});
