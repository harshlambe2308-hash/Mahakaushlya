/**
 * ============================================================
 * MahaKaushal Non-Responder Queue & Follow-up (queue.js)
 * ============================================================
 * - Calls GET /admin/queue/non-responders (LIVE data only, honest empty state)
 * - Renders the non-responder worklist with days-overdue from the API
 * - Wires "Trigger Campaign" to POST /api/admin/queue/trigger-campaign with
 *   the selected candidate PRNs (creates real pending follow-up records;
 *   the response states plainly that no SMS/WhatsApp was dispatched because
 *   no gateway is integrated — TRD §9)
 * - "Log & Queue Next" (saveOutcomeBtn) creates an officer follow-up prompt
 *   via POST /api/admin/followups for the selected trainee
 * - Global window.selectTrainee for the detail drawer
 * ============================================================
 */

import { adminRequest, showAdminBanner } from './adminApi.js';

let queueData = [];
let selectedPrn = null;

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.selectTrainee = function (uid, name, phone, course, vtp, stage, overdue, attempts) {
  selectedPrn = uid;
  const nameEl = document.getElementById('panelTraineeName');
  if (nameEl && name) nameEl.textContent = name;

  const uidEl = document.getElementById('panelTraineeUid');
  if (uidEl && uid) uidEl.textContent = `UID: ${uid}`;

  const dueBadgeEl = document.getElementById('panelTraineeDueBadge');
  if (dueBadgeEl && overdue) dueBadgeEl.textContent = overdue;

  const attemptsEl = document.getElementById('panelTraineeAttempts');
  if (attemptsEl && attempts) attemptsEl.textContent = `${attempts} made`;

  const courseEl = document.getElementById('panelTraineeCourse');
  if (courseEl && course) courseEl.textContent = course;

  const vtpEl = document.getElementById('panelTraineeVtp');
  if (vtpEl && vtp) vtpEl.textContent = vtp;

  const phoneEl = document.getElementById('panelTraineePhone');
  if (phoneEl && phone) phoneEl.textContent = phone;

  // Highlight selected row
  document.querySelectorAll('tbody tr').forEach((r) => {
    if (uid && r.textContent.includes(uid)) {
      r.classList.add('bg-surface-container-high/60');
    } else {
      r.classList.remove('bg-surface-container-high/60');
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('table tbody');

  // 1. Fetch non-responder queue data
  loadQueue();

  function loadQueue() {
    if (!tbody) return;
    tbody.innerHTML = `
      <tr><td colspan="7" class="py-8 text-center text-on-surface-variant font-label-md">
        <span class="material-symbols-outlined animate-spin align-middle mr-1">progress_activity</span>
        Loading non-responder queue…
      </td></tr>`;

    adminRequest('/api/admin/queue/non-responders')
      .then((response) => {
        if (!response || !response.success || !Array.isArray(response.data)) {
          tbody.innerHTML = emptyRow((response && response.message) || 'Failed to load the non-responder queue.');
          return;
        }
        queueData = response.data;
        if (queueData.length === 0) {
          tbody.innerHTML = emptyRow('No non-responders — every pending follow-up has been answered.');
          return;
        }
        renderQueueTable(queueData);
      })
      .catch(() => {
        tbody.innerHTML = emptyRow('Unable to reach the MahaKaushalya API. Is the backend running on port 5000?');
      });
  }

  function emptyRow(message) {
    return `<tr><td colspan="7" class="py-10 text-center">
      <span class="material-symbols-outlined text-3xl text-on-tertiary-container block mb-1">task_alt</span>
      <span class="font-label-md text-label-md text-on-surface-variant">${esc(message)}</span>
    </td></tr>`;
  }

  function renderQueueTable(candidates) {
    if (!tbody) return;
    tbody.innerHTML = '';

    candidates.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.className = `transition-colors cursor-pointer ${idx === 0 ? 'bg-surface-container-high/60' : 'hover:bg-surface-container-low'}`;

      const uid = c.uid || c.prn || `—`;
      const name = c.name || 'Unknown trainee';
      const phone = c.phone || '—';
      const course = c.course || 'Vocational Trade';
      const vtp = c.vtp || '—';
      const stage = c.stage || '6-Month Retention';
      const overdue = c.overdue || `${c.daysOverdue || 0} days overdue`;
      const attempts = c.attempts || 1;
      const channel = c.channel || 'SMS';

      tr.onclick = () =>
        window.selectTrainee(uid, name, phone, course, vtp, stage, overdue, attempts);

      tr.innerHTML = `
        <td class="p-space-md text-center" onclick="event.stopPropagation();">
          <input type="checkbox" value="${esc(uid)}" class="candidate-checkbox rounded accent-secondary w-4 h-4" ${idx === 0 ? 'checked' : ''}/>
        </td>
        <td class="p-space-md">
          <div class="flex flex-col">
            <span class="font-label-md text-label-md text-primary font-bold">${esc(name)}</span>
            <span class="font-data-mono text-[11px] text-on-surface-variant">UID: ${esc(uid)}</span>
            <span class="font-data-mono text-[11px] text-secondary font-medium mt-0.5 flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[12px]">${channel === 'WhatsApp' ? 'chat' : 'phone'}</span> ${esc(phone)} (${esc(channel)})
            </span>
          </div>
        </td>
        <td class="p-space-md max-w-xs">
          <div class="flex flex-col truncate">
            <span class="font-label-md text-label-md text-on-surface truncate">${esc(course)}</span>
            <span class="font-body-sm text-[11px] text-on-surface-variant truncate">${esc(vtp)}</span>
          </div>
        </td>
        <td class="p-space-md">
          <div class="flex flex-col">
            <span class="px-2 py-0.5 bg-error-container text-on-error-container font-label-sm text-[11px] rounded font-semibold w-fit">
              ${esc(stage)}
            </span>
            <span class="font-data-mono text-[11px] text-error font-bold mt-1">${esc(overdue)}</span>
          </div>
        </td>
        <td class="p-space-md">
          <div class="flex flex-col">
            <span class="font-data-mono text-[11px] text-on-surface">Recent: ${esc(channel)} Prompt</span>
            <span class="text-[11px] text-on-surface-variant italic">Unresponsive</span>
            <span class="font-data-mono text-[10px] text-secondary font-bold">Attempt #${esc(attempts)}</span>
          </div>
        </td>
        <td class="p-space-md">
          <span class="font-label-sm text-on-surface-variant">DSO Auto-Queue</span>
        </td>
        <td class="p-space-md text-right" onclick="event.stopPropagation();">
          <button class="px-2 py-1 bg-secondary text-on-secondary text-[11px] font-bold rounded hover:bg-secondary/90 transition-colors" onclick="window.selectTrainee('${esc(uid)}', '${esc(name)}', '${esc(phone)}', '${esc(course)}', '${esc(vtp)}', '${esc(stage)}', '${esc(overdue)}', '${esc(attempts)}');">
            Follow-Up
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Select first row in panel
    if (candidates[0]) {
      const c = candidates[0];
      window.selectTrainee(c.uid, c.name, c.phone, c.course, c.vtp, c.stage, c.overdue, c.attempts);
    }
  }

  // 2. #saveOutcomeBtn — create a real officer follow-up prompt for the
  // selected trainee. NO fake "logged to state DB" animation: the API result
  // is surfaced honestly, including the no-gateway caveat.
  const saveOutcomeBtn = document.getElementById('saveOutcomeBtn');
  if (saveOutcomeBtn) {
    const originalText = saveOutcomeBtn.innerHTML;
    saveOutcomeBtn.addEventListener('click', async () => {
      const trainee = queueData.find((c) => c.uid === selectedPrn);
      if (!trainee || !trainee.traineeId) {
        showAdminBanner('Select a candidate from the queue first.', 'info');
        return;
      }

      saveOutcomeBtn.innerHTML =
        '<span class="material-symbols-outlined text-[18px] animate-spin">sync</span> Creating follow-up prompt…';
      saveOutcomeBtn.disabled = true;

      try {
        const res = await adminRequest('/api/admin/followups', {
          method: 'POST',
          body: {
            traineeId: trainee.traineeId,
            channel: (trainee.channel || 'SMS') === 'WhatsApp' ? 'whatsapp' : 'sms',
            question: `MSSDS officer outreach: please confirm your current employment status (ref ${trainee.uid}).`,
          },
        });

        if (res && res.success) {
          saveOutcomeBtn.innerHTML =
            '<span class="material-symbols-outlined text-[18px]">done_all</span> Follow-up Recorded';
          saveOutcomeBtn.classList.remove('bg-secondary');
          saveOutcomeBtn.classList.add('bg-tertiary-container', 'text-on-tertiary-container');
          showAdminBanner(
            (res.message || 'Follow-up prompt created.') + ' (No SMS/WhatsApp dispatched — gateway not integrated.)',
            'success'
          );
          loadQueue();
        } else {
          showAdminBanner((res && res.message) || 'Failed to create the follow-up prompt.', 'error');
        }
      } catch (err) {
        showAdminBanner('Follow-up request failed — check the API connection.', 'error');
      } finally {
        setTimeout(() => {
          saveOutcomeBtn.innerHTML = originalText;
          saveOutcomeBtn.classList.remove('bg-tertiary-container', 'text-on-tertiary-container');
          saveOutcomeBtn.classList.add('bg-secondary');
          saveOutcomeBtn.disabled = false;
        }, 1500);
      }
    });
  }

  // 3. #selectAllCheckbox
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      const isChecked = selectAllCheckbox.checked;
      document.querySelectorAll('tbody input[type="checkbox"]').forEach((cb) => (cb.checked = isChecked));
    });
  }

  // 4. #resetFilters
  const resetFiltersBtn = document.getElementById('resetFilters');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('select').forEach((select) => (select.selectedIndex = 0));
      showAdminBanner('Queue filters reset to default.', 'info');
    });
  }

  // 5. "Trigger Campaign" / "MahaGov WhatsApp/SMS Blast" button — calls the
  // real backend route, which creates pending follow-up prompts. The toast
  // text no longer claims a gateway broadcast happened.
  const buttons = document.querySelectorAll('button');
  let triggerCampaignBtn = null;
  buttons.forEach((btn) => {
    if (btn.textContent.includes('WhatsApp/SMS Blast') || btn.textContent.includes('Trigger Campaign')) {
      triggerCampaignBtn = btn;
    }
  });

  if (triggerCampaignBtn) {
    triggerCampaignBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('tbody input[type="checkbox"]:checked');
      const selectedIds = Array.from(checkedBoxes).map((cb) => cb.value).filter(Boolean);

      if (selectedIds.length === 0) {
        showAdminBanner('Please select at least one candidate from the queue to trigger follow-up.', 'info');
        return;
      }

      const confirmed = window.confirm(
        `Create pending follow-up prompts for ${selectedIds.length} non-responding trainee(s)?\n\nNote: no SMS/WhatsApp message will be sent — the notification gateway is not integrated. Trainees will see the prompt on their dashboard.`
      );
      if (!confirmed) return;

      const originalHtml = triggerCampaignBtn.innerHTML;
      triggerCampaignBtn.innerHTML =
        '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Queuing Prompts…';
      triggerCampaignBtn.disabled = true;

      try {
        const res = await adminRequest('/api/admin/queue/trigger-campaign', {
          method: 'POST',
          body: { candidateIds: selectedIds, channel: 'sms' },
        });

        if (res && res.success) {
          triggerCampaignBtn.innerHTML =
            '<span class="material-symbols-outlined text-[16px]">done_all</span> Prompts Queued';
          showAdminBanner(
            (res.message || `Follow-up prompts created for ${selectedIds.length} candidates.`) + ' (No SMS/WhatsApp dispatched — gateway not integrated.)',
            'success'
          );
          loadQueue();
        } else {
          triggerCampaignBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">error</span> Failed';
          showAdminBanner((res && res.message) || 'Campaign trigger failed.', 'error');
        }
      } catch (err) {
        triggerCampaignBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">error</span> Failed';
        showAdminBanner('Campaign request failed — check the API connection.', 'error');
      } finally {
        setTimeout(() => {
          triggerCampaignBtn.innerHTML = originalHtml;
          triggerCampaignBtn.disabled = false;
        }, 2500);
      }
    });
  }
});
