import { api } from './api.js';
import { getToken, hasOfficerRole } from '../../shared/auth.js';
import {
  hideBanner,
  setButtonLoading,
  showApiError,
  showBanner,
  showPageSpinner,
  wireInternalLinks,
} from './ui.js';

function currentBranch() {
  const panels = ['employed', 'self', 'apprenticeship', 'unemployed'];
  for (const id of panels) {
    const panel = document.getElementById(`panel-${id}`);
    if (panel && !panel.classList.contains('hidden')) return id;
  }
  return 'employed';
}

function val(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function requireFields(pairs) {
  const missing = pairs.filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) {
    showBanner('error', `Please fill: ${missing.join(', ')}.`, 'Missing required fields');
    return false;
  }
  return true;
}

function buildPayload() {
  const branch = currentBranch();

  // Map the UI branch to the merged backend's `status` vocabulary:
  // employed | self_employed | higher_studies | unemployed
  const statusMap = {
    employed: 'employed',
    self: 'self_employed',
    apprenticeship: 'higher_studies',
    unemployed: 'unemployed',
  };
  // Coarse statutory category kept in `outcomeType`
  const typeMap = {
    employed: 'wage_employment',
    self: 'self_employment',
    apprenticeship: 'higher_education',
    unemployed: null,
  };

  const base = {
    status: statusMap[branch],
    outcomeType: typeMap[branch],
    declarationAccepted: Boolean(document.getElementById('declaration-check')?.checked),
  };

  if (branch === 'employed') {
    const ok = requireFields([
      ['Employer name', val('employerName')],
      ['Job title', val('jobTitle')],
      ['Monthly wage', val('monthlyWage')],
      ['Date of joining', val('dateOfJoining')],
    ]);
    if (!ok) return null;
    return {
      ...base,
      employerName: val('employerName'),
      designation: val('jobTitle'),
      monthlySalary: Number(String(val('monthlyWage')).replace(/[^\d.]/g, '')),
      joiningDate: val('dateOfJoining'),
      workLocation: val('workLocation'),
      remarks: `Industry sector: ${val('industrySector') || '—'}; UAN: ${val('uanNumber') || '—'}`,
    };
  }

  if (branch === 'self') {
    const ok = requireFields([
      ['Enterprise name', val('enterpriseName')],
      ['Monthly revenue', val('monthlyRevenue')],
    ]);
    if (!ok) return null;
    return {
      ...base,
      employerName: val('enterpriseName'),
      monthlySalary: Number(String(val('monthlyRevenue')).replace(/[^\d.]/g, '')),
      remarks: `Udyam/license: ${val('udyamNumber') || '—'}; workers: ${val('workersCount') || '0'}`,
    };
  }

  if (branch === 'apprenticeship') {
    const ok = requireFields([
      ['Institution / establishment', val('institutionName')],
    ]);
    if (!ok) return null;
    return {
      ...base,
      employerName: val('institutionName'),
      remarks: `Program: ${val('programName') || '—'}; stipend: ${val('educationStipend') || '—'}; duration: ${val('programDuration') || '—'}`,
    };
  }

  const ok = requireFields([['Primary reason', val('unemployedReason')]]);
  if (!ok) return null;
  return {
    ...base,
    remarks: `Reason: ${val('unemployedReason')}; assistance requested: ${val('assistanceRequested') || '—'}`,
  };
}

function showSuccessBanner(result) {
  const ref = result?.id || result?.referenceId || 'submitted';
  showBanner(
    'success',
    `Your outcome report was recorded. Reference: ${ref}. It is now pending official verification.`,
    'Outcome submitted successfully'
  );

  const toast = document.getElementById('toast-success');
  if (toast) {
    toast.classList.remove('translate-y-32', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  }
}

async function handleSubmit(event) {
  event?.preventDefault?.();
  hideBanner();

  if (!getToken()) {
    showBanner('error', 'Please log in before submitting an outcome report.', 'Session required');
    window.location.href = 'trainee_login.html';
    return;
  }

  if (hasOfficerRole()) {
    showBanner('error', 'You are signed in with a Government officer account. Please sign in with your trainee credentials.', 'Wrong portal');
    window.setTimeout(() => { window.location.href = 'trainee_login.html'; }, 1200);
    return;
  }

  if (!document.getElementById('declaration-check')?.checked) {
    showBanner('error', 'Accept the statutory legal declaration before submitting.', 'Declaration required');
    return;
  }

  const payload = buildPayload();
  if (!payload) return;

  const submitBtn = document.getElementById('submit-btn');
  setButtonLoading(submitBtn, true, 'Submitting to ledger…');
  showPageSpinner(true, 'Submitting outcome…');

  try {
    const res = await api.submitOutcome(payload);
    if (!res.ok) {
      setButtonLoading(submitBtn, false);
      showBanner('error', res.message, `Submission failed (${res.status})`);
      return;
    }
    showSuccessBanner(res.data || {});
    submitBtn.innerHTML =
      '<span class="material-symbols-outlined text-lg">verified</span> <span>Record Verified &amp; Submitted</span>';
    submitBtn.classList.remove('bg-primary');
    submitBtn.classList.add('bg-tertiary-container', 'text-white');
    submitBtn.disabled = true;
  } catch (err) {
    setButtonLoading(submitBtn, false);
    showApiError(err);
  } finally {
    showPageSpinner(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  wireInternalLinks();

  const form = document.getElementById('outcome-form');
  if (form) form.addEventListener('submit', handleSubmit);
});
