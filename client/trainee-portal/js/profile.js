/**
 * ============================================================
 * MahaKaushal Trainee Portal — Profile & Settings (profile.js)
 * ============================================================
 * Rewritten as a real module (the previous version was an inline simulation:
 * save was a setTimeout toast and never touched the API).
 * - Hydrates the editable fields from GET /api/trainee/dashboard
 * - "Save Profile Changes" calls PUT /api/trainee/profile (validated email /
 *   phone server-side) and updates the on-page save indicator for real
 * - Unimplemented extras (OTP phone change, DigiLocker download, DPDP audit
 *   package) state honestly that they are not available instead of faking
 *   success toasts
 * - Adds a Sign out action and redirects logged-out visitors to the login
 * ============================================================
 */

import { api } from './api.js';
import { getToken, clearToken, hasOfficerRole } from '../../shared/auth.js';
import { hideBanner, showApiError, showBanner, showPageSpinner, wireInternalLinks } from './ui.js';

let currentTrainee = null;

function el(id) {
  return document.getElementById(id);
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  if (toast && toastMsg) {
    toastMsg.textContent = msg;
    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    setTimeout(() => {
      toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
    }, 3200);
  } else {
    showBanner('info', msg);
  }
}

function setSaveState(text) {
  const indicator = document.getElementById('saveStateText');
  if (indicator) indicator.textContent = text;
}

/** Fill the profile form with the live record (real values replace demo ones). */
function hydrateProfile(trainee) {
  if (!trainee) return;
  currentTrainee = trainee;

  const fullName = el('fullName');
  if (fullName) fullName.value = trainee.fullName || '';

  const email = el('emailAddr');
  if (email) email.value = trainee.email || '';

  const district = el('districtSelect');
  if (district && trainee.district) {
    // Match the district option text ("Pune (पुणे) - Pune Division")
    const match = Array.from(district.options).find((o) =>
      o.textContent.toLowerCase().startsWith(String(trainee.district).toLowerCase())
    );
    if (match) district.value = match.value;
  }

  const address = el('addressInput');
  if (address) address.value = trainee.address || '';

  // Statutory identifier (PRN) — display-only
  const prnEl = document.querySelector('.font-headline-sm.tracking-wider.font-mono');
  if (prnEl && trainee.prn) prnEl.textContent = trainee.prn;

  // Header identity
  const nameHeading = Array.from(document.querySelectorAll('h2')).find((h) =>
    h.textContent.includes('Jadhav') || h.classList.contains('font-headline-sm')
  );
  if (nameHeading && trainee.fullName) nameHeading.textContent = trainee.fullName;
}

async function saveAllChanges() {
  if (!getToken()) {
    showBanner('error', 'Please log in to edit your profile.', 'Session required');
    window.location.href = 'trainee_login.html';
    return;
  }

  const fullName = el('fullName')?.value.trim() || '';
  const email = el('emailAddr')?.value.trim() || '';
  const districtSelect = el('districtSelect');
  const district = districtSelect && districtSelect.selectedIndex > 0
    ? districtSelect.options[districtSelect.selectedIndex].textContent.split('(')[0].trim()
    : undefined;
  const address = el('addressInput')?.value.trim() || '';

  // Client-side validation mirroring the API rules
  if (!fullName) {
    showBanner('error', 'Full name cannot be empty.', 'Validation');
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showBanner('error', 'Enter a valid email address.', 'Validation');
    return;
  }

  setSaveState('Saving parameters…');
  showPageSpinner(true, 'Saving profile…');

  try {
    const body = { fullName };
    if (email) body.email = email;
    if (district) body.district = district;
    if (address) body.address = address;

    const res = await api.updateProfile(body);

    if (!res.ok) {
      setSaveState('Unsaved changes');
      showBanner('error', res.message, `Save failed (${res.status})`);
      return;
    }

    hydrateProfile(res.data);
    setSaveState('All changes saved to CIDR');
    showBanner('success', 'Your profile changes have been saved to your official record.', 'Profile updated');
  } catch (err) {
    setSaveState('Unsaved changes');
    showApiError(err);
  } finally {
    showPageSpinner(false);
  }
}
window.saveAllChanges = saveAllChanges;

// ---------------------------------------------------------------------------
// Honest handlers for features that have no backend (PRD/TRD out-of-scope)
// ---------------------------------------------------------------------------
window.discardChanges = function () {
  if (currentTrainee) hydrateProfile(currentTrainee);
  setSaveState('Form reset to last committed state');
  showToast('Form reset to your saved record.');
};

window.triggerDownload = function () {
  showBanner(
    'info',
    'DigiLocker credential download is not available in this release — the DigiLocker integration is not implemented (TRD §9).',
    'Not yet available'
  );
};

window.triggerAuditDownload = function () {
  showBanner(
    'info',
    'The statutory DPDP audit package export is not available in this release.',
    'Not yet available'
  );
};

window.openOtpModal = function () {
  showBanner(
    'info',
    'OTP-based phone changes are not available in this release (no SMS gateway is integrated — TRD §9). Contact your District Verification Cell to update your number.',
    'Not yet available'
  );
};

window.closeOtpModal = function () {
  const modal = document.getElementById('otpModal');
  if (modal) modal.classList.add('hidden');
};

window.confirmOtpUpdate = function () {
  window.closeOtpModal();
};

document.addEventListener('DOMContentLoaded', async () => {
  wireInternalLinks();

  if (!getToken()) {
    showBanner('error', 'Please log in to view your profile.', 'Session required');
    window.setTimeout(() => {
      window.location.href = 'trainee_login.html';
    }, 900);
    return;
  }

  if (hasOfficerRole()) {
    clearToken();
    showBanner('error', 'You are signed in with a Government officer account. Please sign in with your trainee credentials.', 'Wrong portal');
    window.setTimeout(() => { window.location.href = 'trainee_login.html'; }, 1200);
    return;
  }

  // Load the live profile
  showPageSpinner(true, 'Loading profile…');
  try {
    const res = await api.getDashboard();
    if (!res.ok) {
      showBanner('error', res.message, `Error ${res.status}`);
      if (res.status === 401) {
        window.setTimeout(() => {
          window.location.href = 'trainee_login.html';
        }, 1200);
      }
      return;
    }
    hydrateProfile(res.data?.trainee);
  } catch (err) {
    showApiError(err);
  } finally {
    showPageSpinner(false);
  }

  // Save button (the design uses onclick="saveAllChanges()")
  const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent || '').includes('Save Profile Changes')
  );
  if (saveBtn) saveBtn.addEventListener('click', saveAllChanges);

  // Sign out action in the accessibility / profile cluster of the header
  const headerRight = document.querySelector('header .flex.items-center.gap-space-md');
  if (headerRight && !document.getElementById('trainee-logout-btn')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'trainee-logout-btn';
    logoutBtn.className =
      'flex items-center gap-1 font-label-sm text-label-sm text-error hover:underline px-2 py-1 rounded';
    logoutBtn.title = 'End session and clear the token from this browser';
    logoutBtn.innerHTML = '<span class="material-symbols-outlined text-base">logout</span><span>Sign out</span>';
    logoutBtn.addEventListener('click', () => {
      clearToken();
      window.location.href = 'trainee_login.html';
    });
    headerRight.appendChild(logoutBtn);
  }
});
