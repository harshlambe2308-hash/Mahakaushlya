/**
 * ============================================================
 * MahaKaushal Admin Portal — Trainee Records & Audit (audit.js)
 * ============================================================
 * - Calls GET /admin/trainees (server-side paginated + filtered)
 * - Renders the register grid from LIVE data only (no static rows)
 * - 300ms debounced search on #traineeSearchInput
 * - District & status dropdown filtering
 * - Row click -> loads the trainee dossier (GET /admin/trainees/:id)
 * - Approve / Flag actions verify the selected PENDING OUTCOME by its real
 *   outcome ID via PUT /api/admin/outcomes/:outcomeId/verify (one-time)
 * ============================================================
 */

import { adminRequest, showAdminBanner } from './adminApi.js';

let currentPage = 1;
let currentLimit = 10;
let totalPages = 1;
let debounceTimer = null;

// The currently selected dossier: { trainee, outcomes, followups }
let currentDossier = null;
// The pending outcome the Approve/Flag buttons will act on.
let currentPendingOutcomeId = null;

/**
 * Populate the KPI tabs and the "Showing records" label from the live API.
 * Summary-tab figures come from the dashboard KPIs (verification status is
 * tracked; "discontinued" is not an outcome status, so it shows —).
 */
async function loadSummaryKpis() {
  try {
    const dashRes = await adminRequest('/api/admin/dashboard');
    if (dashRes.success && dashRes.data) {
      setText('kpi-all-trainees', Number(dashRes.data.totalTrainees || 0).toLocaleString('en-IN'));
      setText('kpi-verified', Number(dashRes.data.verifiedOutcomes || 0).toLocaleString('en-IN'));
      setText('kpi-pending', Number(dashRes.data.pendingFollowups || 0).toLocaleString('en-IN'));
      setText('kpi-flagged', Number(dashRes.data.rejectedOutcomes || 0).toLocaleString('en-IN'));
      // "Discontinued / Inactive" is not a tracked status in the schema — honest em-dash.
      setText('kpi-inactive', '—');
    }
  } catch (err) {
    console.warn('[Audit] KPI load failed:', err);
  }
}

function setText(id, value) {
  const elx = document.getElementById(id);
  if (elx && value != null) elx.textContent = value;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function el(id) {
  return document.getElementById(id);
}

function resolveDistrictSelect() {
  const selects = Array.from(document.querySelectorAll('select'));
  return selects.find((s) =>
    Array.from(s.options).some((o) => /pune|district|haveli|mumbai|nagpur|nashik/i.test(o.textContent))
  );
}

function resolveStatusSelect() {
  const selects = Array.from(document.querySelectorAll('select'));
  return selects.find((s) =>
    Array.from(s.options).some((o) => /all status|verified|pending|rejected/i.test(o.textContent))
  );
}

function readFilters() {
  const districtSelect = resolveDistrictSelect();
  const statusSelect = resolveStatusSelect();
  const query = el('traineeSearchInput')?.value.trim() || '';
  const district =
    districtSelect && !/all/i.test(districtSelect.options[districtSelect.selectedIndex]?.text || '')
      ? districtSelect.value
      : '';
  const status =
    statusSelect && !/all/i.test(statusSelect.options[statusSelect.selectedIndex]?.text || '')
      ? statusSelect.value
      : '';
  const params = { page: currentPage, limit: currentLimit };
  if (query) params.search = query;
  if (district) params.district = district;
  if (status) params.status = status;
  return params;
}

async function fetchTrainees() {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td colspan="6" class="py-8 text-center text-on-surface-variant font-label-md">
      <span class="material-symbols-outlined animate-spin align-middle mr-1">progress_activity</span>
      Loading trainee register…
    </td></tr>`;

  try {
    const res = await adminRequest('/api/admin/trainees', { params: readFilters() });
    const rows = res?.data?.trainees || [];

    if (!res.success) {
      tbody.innerHTML = errorRow(res.message || 'Failed to load trainee records.');
      return;
    }
    if (rows.length === 0) {
      tbody.innerHTML = emptyRow('No trainee records match the current filters.');
      updatePagination(res.data);
      return;
    }

    renderTable(rows);
    updatePagination(res.data);
  } catch (err) {
    console.warn('[Audit] register load failed:', err);
    tbody.innerHTML = errorRow('Unable to reach the MahaKaushalya API. Is the backend running on port 5000?');
  }
}

function emptyRow(message) {
  return `<tr><td colspan="6" class="py-10 text-center">
    <span class="material-symbols-outlined text-3xl text-outline block mb-1">search_off</span>
    <span class="font-label-md text-label-md text-on-surface-variant">${esc(message)}</span>
  </td></tr>`;
}

function errorRow(message) {
  return `<tr><td colspan="6" class="py-10 text-center">
    <span class="material-symbols-outlined text-3xl text-error block mb-1">cloud_off</span>
    <span class="font-label-md text-label-md text-error">${esc(message)}</span>
  </td></tr>`;
}

function renderTable(trainees) {
  const tbody = document.querySelector('table tbody');

  tbody.innerHTML = '';
  trainees.forEach((t) => {
    const tr = document.createElement('tr');
    tr.className = 'bg-surface-container-lowest hover:bg-surface-container-low transition-colors cursor-pointer border-b border-surface-container-low';

    const traineeId = t.prn || t.id || 'MK-0000';
    tr.onclick = () => loadDossier(t.id, traineeId);
    tr.dataset.traineeId = t.id;

    const initials = (t.fullName || 'TR').substring(0, 2).toUpperCase();
    const outcome = t.latestOutcome;
    const statusText = outcome
      ? outcome.verificationStatus === 'verified'
        ? 'Verified'
        : outcome.verificationStatus === 'rejected'
          ? 'Rejected'
          : 'Pending Verification'
      : 'No Outcome Submitted';
    const isVerified = statusText === 'Verified';
    const isRejected = statusText === 'Rejected';

    const badgeClass = isVerified
      ? 'bg-surface-container-high text-tertiary-container'
      : isRejected
        ? 'bg-error-container text-on-error-container'
        : 'bg-surface-container text-secondary';

    const employer = outcome?.employerName || (outcome ? outcomeLabel(outcome.status) : '—');
    const designation = outcome?.designation || (outcome ? 'Self-reported' : 'No employment record');
    const salary = Number(outcome?.monthlySalary || 0);

    tr.innerHTML = `
      <td class="py-3 px-space-md">
        <div class="flex items-start gap-space-sm">
          <div class="w-8 h-8 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
            ${esc(initials)}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-label-md text-on-surface font-bold truncate">${esc(t.fullName)}</span>
            <span class="font-data-mono text-[11px] text-outline font-medium">${esc(traineeId)}</span>
            <span class="font-label-sm text-[10px] text-on-surface-variant">${esc(t.gender ? `${t.gender.charAt(0).toUpperCase()} • ` : '')}${esc(t.district || 'District N/A')}</span>
          </div>
        </div>
      </td>
      <td class="py-3 px-space-sm">
        <div class="flex flex-col">
          <span class="font-label-md text-label-md text-on-surface font-medium truncate">${esc(t.courseName || t.trade || 'MSSDS Skilling Scheme')}</span>
          <span class="font-label-sm text-[11px] text-on-surface-variant truncate">${esc(t.trainingCenter || 'Center N/A')}</span>
          <span class="font-data-mono text-[10px] text-outline">Batch: ${esc(t.batchName || '—')}</span>
        </div>
      </td>
      <td class="py-3 px-space-sm">
        <div class="flex flex-col">
          <span class="font-label-md text-label-md text-on-surface font-semibold truncate">${esc(employer)}</span>
          <span class="font-label-sm text-[11px] text-on-surface-variant">${esc(designation)}</span>
          <span class="font-data-mono text-[10px] ${outcome?.proofDocumentUrl ? 'text-on-tertiary-container' : 'text-outline'} flex items-center gap-0.5">
            <span class="material-symbols-outlined text-[12px]">${outcome?.proofDocumentUrl ? 'description' : 'hide_source'}</span> ${outcome?.proofDocumentUrl ? 'Proof Attached' : 'No Proof URL'}
          </span>
        </div>
      </td>
      <td class="py-3 px-space-sm">
        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded ${badgeClass} font-label-sm text-label-sm font-bold status-badge">
          <span class="w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-on-tertiary-container' : isRejected ? 'bg-on-error-container' : 'bg-secondary'}"></span>
          ${esc(statusText)}
        </div>
      </td>
      <td class="py-3 px-space-sm text-right font-data-mono font-bold ${salary > 0 ? 'text-primary' : 'text-outline'}" style="font-variant-numeric: tabular-nums;">
        ${salary > 0 ? `₹${salary.toLocaleString('en-IN')}<span class="text-[10px] font-normal text-on-surface-variant">/mo</span>` : '—'}
      </td>
      <td class="py-3 px-space-md text-center">
        <button class="p-1.5 rounded hover:bg-surface-container-high text-primary transition-colors proof-preview-btn" title="Open Audit Dossier">
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function outcomeLabel(status) {
  const map = {
    employed: 'Wage Employment',
    self_employed: 'Self-Employment',
    higher_studies: 'Higher Studies',
    unemployed: 'Unemployed',
  };
  return map[status] || 'Outcome Reported';
}

function updatePagination(data) {
  if (!data) return;
  totalPages = data.totalPages || Math.max(Math.ceil((data.total || 0) / (data.limit || currentLimit)), 1);
  currentPage = data.page || currentPage;
  const total = data.total || 0;
  const from = total === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const to = Math.min(currentPage * currentLimit, total);
  // "Showing records X - Y of N" from the LIVE trainee-list response
  const showingLabel = document.getElementById('showing-label');
  if (showingLabel) showingLabel.textContent = `Showing records ${from} - ${to} of ${total}`;
  // Update the "Page X of Y" text in the ledger footer if present
  const pageLabel = Array.from(document.querySelectorAll('span')).find((s) =>
    /^Page \d+/.test(s.textContent.trim())
  );
  if (pageLabel) pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
}

function wirePaginator() {
  const prevBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    b.querySelector('.material-symbols-outlined')?.textContent === 'chevron_left'
  );
  const nextBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    b.querySelector('.material-symbols-outlined')?.textContent === 'chevron_right' && !b.classList.contains('proof-preview-btn')
  );

  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentPage > 1) {
      currentPage -= 1;
      fetchTrainees();
    }
  });
  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentPage < totalPages) {
      currentPage += 1;
      fetchTrainees();
    }
  });
}

// ---------------------------------------------------------------------------
// Dossier: fetch the trainee's full record and populate the slide-over panel
// ---------------------------------------------------------------------------
async function loadDossier(traineeId, prnLabel) {
  try {
    const res = await adminRequest(`/api/admin/trainees/${encodeURIComponent(traineeId)}`);
    if (!res.success || !res.data) {
      showAdminBanner(res.message || 'Failed to load the trainee dossier.', 'error');
      return;
    }
    currentDossier = res.data;
    renderDossier(prnLabel || res.data.trainee.prn);
    highlightSelected(prnLabel || res.data.trainee.prn);

    // Decide which outcome the verification buttons act on: the newest PENDING
    // outcome (verification is a one-time action per outcome).
    const pending = (currentDossier.outcomes || []).filter((o) => o.verificationStatus === 'pending');
    currentPendingOutcomeId = pending.length ? pending[0].id : null;
    updateActionButtons(pending.length > 0);
  } catch (err) {
    console.warn('[Audit] dossier load failed:', err);
    showAdminBanner('Unable to load the trainee dossier. Check the API connection.', 'error');
  }
}

function renderDossier(prnLabel) {
  const { trainee, outcomes = [], followups = [] } = currentDossier;

  // Identity block
  const nameEl = Array.from(document.querySelectorAll('h2')).find((h) => h.closest('.bg-surface-container-low'));
  if (nameEl) nameEl.textContent = trainee.fullName;
  const prnEl = Array.from(document.querySelectorAll('h2 ~ span, h2 + span')).find((s) => /^MK-/.test(s.textContent.trim())) ||
    Array.from(document.querySelectorAll('.font-data-mono')).find((s) => /^MK-/.test(s.textContent.trim()) && s.closest('.bg-surface-container-low'));
  if (prnEl) prnEl.textContent = prnLabel || trainee.prn;

  // Identity line + metadata block (real tracked fields only)
  const identityLine = document.getElementById('dossier-identity-line');
  if (identityLine) {
    identityLine.textContent = trainee.dob
      ? `DOB: ${trainee.dob} • Registry verified record`
      : 'Registry-verified record (no DOB on file)';
  }
  setText('dossier-contact', trainee.phone || '—');
  setText('dossier-district', trainee.district || '—');
  setText('dossier-trade', trainee.trade || '—');
  setText('dossier-batch', trainee.batchName || '—');
  const courseMeta = document.getElementById('dossier-course-meta');
  if (courseMeta) {
    courseMeta.textContent = `${trainee.trainingCenter || 'Center N/A'}${trainee.trainingPartner ? ` • Partner: ${trainee.trainingPartner}` : ''}`;
  }
  setText('dossier-outcome-count', `${outcomes.length} claim(s)`);

  // Metadata block: contact / district / course / grade
  const metaGrid = document.querySelector('.grid.grid-cols-2.gap-x-2');
  if (metaGrid) {
    const values = metaGrid.querySelectorAll('span.font-data-mono, .grid.grid-cols-2 > div > span:last-child');
    const contact = values[0];
    const district = values[1];
    if (contact) contact.textContent = trainee.phone || '—';
    if (district) district.textContent = trainee.district || '—';
  }
  const coursePill = document.querySelector('.px-space-md.py-space-sm.bg-surface-container span.text-primary.font-bold');
  if (coursePill) coursePill.textContent = `Course: ${trainee.courseName || trainee.trade || '—'}`;

  // Verification trail: rebuild from real outcomes
  const trailHost = document.querySelector('.relative.pl-6');
  if (trailHost) {
    trailHost.innerHTML = '';
    if (outcomes.length === 0) {
      trailHost.innerHTML = `<p class="font-body-sm text-body-sm text-on-surface-variant">No outcome submissions recorded yet for this trainee.</p>`;
    } else {
      outcomes.forEach((o) => {
        const decided = o.verificationStatus !== 'pending';
        const dotColor = o.verificationStatus === 'verified' ? 'bg-primary' : o.verificationStatus === 'rejected' ? 'bg-error' : 'bg-secondary';
        const icon = o.verificationStatus === 'verified' ? 'done' : o.verificationStatus === 'rejected' ? 'close' : 'pending_actions';
        const item = document.createElement('div');
        item.className = 'relative';
        item.innerHTML = `
          <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full ${dotColor} flex items-center justify-center text-on-primary">
            <span class="material-symbols-outlined text-[10px]">${icon}</span>
          </span>
          <div class="flex flex-col">
            <div class="flex items-baseline justify-between">
              <span class="font-label-md text-label-md text-primary font-bold">${esc(outcomeLabel(o.status))} Claim</span>
              <span class="font-data-mono text-[10px] text-on-surface-variant">${esc((o.submittedAt || '').slice(0, 10))}</span>
            </div>
            <p class="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
              ${esc(o.employerName || outcomeLabel(o.status))}${o.monthlySalary ? ` • ₹${Number(o.monthlySalary).toLocaleString('en-IN')}/mo` : ''}${o.workLocation ? ` • ${esc(o.workLocation)}` : ''}
            </p>
            <div class="bg-surface-container-low p-space-xs rounded mt-1 flex items-center justify-between text-label-sm">
              <span class="text-on-surface-variant font-label-sm text-[11px]">Verification:</span>
              <span class="font-data-mono font-bold text-[11px] ${o.verificationStatus === 'verified' ? 'text-on-tertiary-container' : o.verificationStatus === 'rejected' ? 'text-error' : 'text-secondary'}">
                ${esc(o.verificationStatus.toUpperCase())}${decided && o.verifiedAt ? ` • ${esc(o.verifiedAt.slice(0, 10))}` : ''}
              </span>
            </div>
            ${o.proofDocumentUrl ? `<a href="${esc(o.proofDocumentUrl)}" target="_blank" rel="noopener" class="text-secondary font-label-sm text-label-sm hover:underline flex items-center gap-0.5 mt-1"><span class="material-symbols-outlined text-[12px]">visibility</span> View Proof Document</a>` : ''}
            ${o.remarks ? `<p class="text-[11px] text-on-surface-variant mt-1 italic">Remarks: ${esc(o.remarks)}</p>` : ''}
          </div>`;
        trailHost.appendChild(item);
      });
    }

    // Follow-up summary line
    const trailHeader = trailHost.previousElementSibling;
    if (trailHeader && trailHeader.querySelector('span.font-data-mono')) {
      trailHeader.querySelector('span.font-data-mono').textContent =
        `${outcomes.length} outcome(s) • ${followups.length} follow-up(s)`;
    }
  }
}

function highlightSelected(prnLabel) {
  const rows = document.querySelectorAll('table tbody tr');
  rows.forEach((row) => {
    if (prnLabel && row.textContent.includes(prnLabel)) {
      row.classList.add('bg-surface-container-low/60');
    } else {
      row.classList.remove('bg-surface-container-low/60');
    }
  });
}

function updateActionButtons(hasPending) {
  const approveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent.includes('Approve Subsidy Tranche')
  );
  const flagBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent.includes('Flag for Inspection')
  );
  [approveBtn, flagBtn].forEach((b) => {
    if (!b) return;
    b.disabled = !hasPending;
    b.classList.toggle('opacity-40', !hasPending);
    b.title = hasPending ? '' : 'No pending outcome — verification is one-time per claim.';
  });
}

// ---------------------------------------------------------------------------
// Verification actions (one-time, by real outcome ID)
// ---------------------------------------------------------------------------
function handleVerification(decision, remarks) {
  if (!currentPendingOutcomeId) {
    showAdminBanner('No pending outcome claim to verify for this trainee.', 'info');
    return;
  }
  showAdminBanner(`Submitting verification: ${decision} for ${currentPendingOutcomeId.slice(0, 8)}…`, 'info');

  adminRequest(`/api/admin/outcomes/${encodeURIComponent(currentPendingOutcomeId)}/verify`, {
    method: 'PUT',
    body: { verificationStatus: String(decision).toLowerCase(), remarks },
  })
    .then((res) => {
      if (res && res.success) {
        showAdminBanner(`Outcome ${decision.toLowerCase()} successfully. This claim is now locked (one-time verification).`, 'success');
        updateActionButtons(false);
        // Refresh dossier + register to reflect the decision
        if (currentDossier?.trainee?.id) {
          loadDossier(currentDossier.trainee.id);
        }
        fetchTrainees();
      } else if (res.status === 409) {
        showAdminBanner('This outcome was already decided. One-time verification cannot be repeated.', 'error');
        updateActionButtons(false);
      } else {
        showAdminBanner((res && res.message) || `Verification failed (${res.status}).`, 'error');
      }
    })
    .catch(() => {
      showAdminBanner('Verification request failed — check the API connection.', 'error');
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = el('traineeSearchInput');
  const districtSelect = resolveDistrictSelect();
  const statusSelect = resolveStatusSelect();

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentPage = 1;
        fetchTrainees();
      }, 300);
    });
  }

  districtSelect?.addEventListener('change', () => {
    currentPage = 1;
    fetchTrainees();
  });
  statusSelect?.addEventListener('change', () => {
    currentPage = 1;
    fetchTrainees();
  });

  // Dossier action buttons (verification is performed on the selected PENDING outcome)
  document.querySelectorAll('button').forEach((btn) => {
    const text = btn.textContent.trim();
    if (text.includes('Approve Subsidy Tranche')) {
      btn.addEventListener('click', () =>
        handleVerification('Verified', 'Statutory outcome verified and subsidy tranche approved.')
      );
    } else if (text.includes('Flag for Inspection')) {
      btn.addEventListener('click', () =>
        handleVerification('Rejected', 'Flagged for physical field inspection.')
      );
    }
  });

  wirePaginator();

  // Export Full Register (CSV) — real server-side export
  const exportBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent.includes('Export Full Register')
  );
  exportBtn?.addEventListener('click', () => {
    showAdminBanner('Downloading the full trainee register as CSV…', 'info');
    window.location.href = '/api/admin/export/trainees.csv';
  });

  // "Initiate Batch Audit" jumps the officer to the overview cockpit's batch
  // authorization action (single batch entry point, no duplicate logic).
  const batchBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent.includes('Initiate Batch Audit')
  );
  batchBtn?.addEventListener('click', () => {
    window.location.href = 'index.html#batch-authorize';
  });

  // KPI tabs + showing label from live data
  loadSummaryKpis();

  // Initial load
  fetchTrainees();
});
