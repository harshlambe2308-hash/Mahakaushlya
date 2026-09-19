/**
 * ============================================================
 * MahaKaushal Training Provider Performance Rankings (provider.js)
 * ============================================================
 * - Calls GET /admin/analytics/provider-performance
 * - Populates ranking tables with Training Center Name, District,
 *   Certified Count, Placement %, and Star Ratings
 * - Adds client-side table column sorting (by Placement % or Rating)
 * - Global window.vtpData and window.selectVTP(index) for inline
 *   onclick inspector selection
 * ============================================================
 */

import { adminRequest, showAdminBanner } from './adminApi.js';

// Global data store with static fallback dataset
window.vtpData = [
  {
    name: "Tata STRIVE Skill Dev Center",
    code: "MH-PUN-042",
    loc: "Hadapsar Industrial Estate, Pune, Maharashtra 411013",
    head: "Col. Vinod Patil (Retd)",
    grade: "GRADE A+",
    count: 4210,
    placement: 91.2,
    retention: "84.0%",
    wageGrowth: "+28.4%",
    status: "Clean",
    stars: 5,
    initials: "TS"
  },
  {
    name: "Symbiosis Skills & Prof. Univ.",
    code: "MH-PUN-088",
    loc: "Village Kiwale, Adjoining Expressway, Pune 412101",
    head: "Dr. Arvind Shinde",
    grade: "GRADE A+",
    count: 3140,
    placement: 88.5,
    retention: "81.2%",
    wageGrowth: "+32.0%",
    status: "Clean",
    stars: 5,
    initials: "SP"
  },
  {
    name: "MITCON Skill Dev Center",
    code: "MH-PUN-019",
    loc: "Kubera Chambers, Shivajinagar, Pune 411005",
    head: "Suresh Deshpande",
    grade: "GRADE A",
    count: 2850,
    placement: 76.4,
    retention: "69.0%",
    wageGrowth: "+19.5%",
    status: "Review",
    stars: 4,
    initials: "MT"
  },
  {
    name: "Apollo MedSkills Academy",
    code: "MH-PUN-104",
    loc: "Mega Center, Magarpatta Road, Hadapsar, Pune 411028",
    head: "Sister Teresa Mathew",
    grade: "GRADE A",
    count: 1920,
    placement: 82.0,
    retention: "77.1%",
    wageGrowth: "+24.0%",
    status: "Clean",
    stars: 4,
    initials: "AM"
  },
  {
    name: "Marathwada Rural Tech Trust",
    code: "MH-BEE-012",
    loc: "Old Mondha Market, Majalgaon, Beed 431131",
    head: "Baburao Kulkarni",
    grade: "GRADE C / Flagged",
    count: 840,
    placement: 38.2,
    retention: "29.0%",
    wageGrowth: "-4.2%",
    status: "Show-Cause",
    stars: 2,
    initials: "MR"
  },
  {
    name: "Vidarbha Vocational Institute",
    code: "MH-NAG-051",
    loc: "MIDC Hingna Industrial Area, Nagpur 440016",
    head: "Gajanan Borkar",
    grade: "GRADE B",
    count: 1450,
    placement: 68.5,
    retention: "59.2%",
    wageGrowth: "+12.1%",
    status: "Biometric Lag",
    stars: 3,
    initials: "VV"
  }
];

// Global row selection for inspector card called by inline onclick="selectVTP(n)"
window.selectVTP = function(index) {
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
      statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold rounded"><span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> ${vtp.status}</span>`;
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

    const rowClass = vtp.grade.includes('C')
      ? 'hover:bg-error-container/20 transition-colors bg-error-container/10 cursor-pointer'
      : 'hover:bg-surface-container-low/60 transition-colors cursor-pointer';

    const countDisplay = Number(vtp.count || 0).toLocaleString();
    const initials = vtp.initials || (vtp.name ? vtp.name.substring(0, 2).toUpperCase() : 'TP');

    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.onclick = () => window.selectVTP(i);

    tr.innerHTML = `
      <td class="py-3 px-space-sm">
        <div class="flex items-center gap-space-sm">
          <div class="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0">${initials}</div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-label-md text-primary font-bold truncate">${vtp.name}</span>
            <span class="font-data-mono text-[11px] text-on-surface-variant">${vtp.code} • ${vtp.loc}</span>
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
      <td class="py-3 px-space-xs text-right font-data-mono font-semibold" style="font-variant-numeric: tabular-nums;">${vtp.retention || '75%'}</td>
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
  ths.forEach((th, idx) => {
    th.style.cursor = 'pointer';
    th.title = 'Click to sort';

    th.addEventListener('click', () => {
      const headerText = th.textContent.toLowerCase();
      let key = null;

      if (headerText.includes('placement') || headerText.includes('%')) key = 'placement';
      else if (headerText.includes('rating') || headerText.includes('star') || headerText.includes('grade')) key = 'stars';
      else if (headerText.includes('certified') || headerText.includes('trainee') || headerText.includes('count')) key = 'count';

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

  // 2. Fetch live provider rankings
  adminRequest('/api/admin/analytics')
    .then(res => {
      const byCenter = res?.data?.placementByCenter || [];
      const rows = byCenter.map((c, idx) => ({
        name: c.center,
        code: `MH-PUN-${String(idx + 1).padStart(3, '0')}`,
        loc: c.center || 'Maharashtra',
        head: '—',
        grade: Number.parseFloat(c.placementRate) >= 85 ? 'GRADE A+' : Number.parseFloat(c.placementRate) >= 60 ? 'GRADE B' : 'GRADE C',
        count: c.totalTrainees,
        placement: Number.parseFloat(c.placementRate) || 0,
        retention: '—',
        wageGrowth: '—',
        status: Number.parseFloat(c.placementRate) >= 40 ? 'Clean' : 'Review',
        stars: Math.max(1, Math.min(5, Math.round((Number.parseFloat(c.placementRate) || 0) / 20))),
        initials: (c.center || 'TP').substring(0, 2).toUpperCase(),
      }));
      if (res && res.success && rows.length > 0) {
        window.vtpData = rows;
        renderTable();
        window.selectVTP(0);
        showAdminBanner('Live training partner rankings loaded from state registry.', 'success');
      }
    })
    .catch(err => {
      console.warn('[Provider] Offline benchmark mode active:', err);
    });

  // Initial render
  renderTable();
  window.selectVTP(0);
});
