/**
 * ============================================================
 * MahaKaushal Trainee Portal — Follow-up Questionnaire (follow-up.js)
 * ============================================================
 * Rewritten to call the REAL backend:
 * - Loads the trainee's pending follow-ups from GET /api/trainee/dashboard
 *   and displays the actual pending question(s) + PRN instead of static demo
 *   data (the static "Rahul Jadhav / MK-2024-MH-08492" shell is overridden
 *   with live values when they exist).
 * - On submit, records the response via POST /api/trainee/followups/respond
 *   for the FIRST pending follow-up. The selected branch + salary/remarks are
 *   composed into the response text, and a new outcome claim is created via
 *   POST /api/trainee/outcomes/submit when the trainee reports a change
 *   (changed job / self-employed / unemployed) so the registry stays accurate.
 * - If no pending follow-up exists, an honest notice replaces the form
 *   (App Flow §11 empty-state rule).
 * ============================================================
 */

import { api } from './api.js';
import { getToken, hasOfficerRole } from '../../shared/auth.js';
import { hideBanner, setButtonLoading, showApiError, showBanner, showPageSpinner } from './ui.js';

function val(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function toggleSections(val) {
  const pSame = document.getElementById('panelSameCompany');
  const pChanged = document.getElementById('panelChangedJob');
  const pSelf = document.getElementById('panelSelfEmployed');
  const pSeek = document.getElementById('panelSeekingJob');

  pSame.classList.add('hidden');
  pChanged.classList.add('hidden');
  pSelf.classList.add('hidden');
  pSeek.classList.add('hidden');

  if (val === 'same_company') {
    pSame.classList.remove('hidden');
  } else if (val === 'changed_job') {
    pChanged.classList.remove('hidden');
  } else if (val === 'self_employed') {
    pSelf.classList.remove('hidden');
  } else if (val === 'seeking_job') {
    pSeek.classList.remove('hidden');
  }
}
window.toggleSections = toggleSections;

function setRating(rating) {
  const hidden = document.getElementById('selectedRating');
  if (hidden) hidden.value = rating;
  const container = document.getElementById('starRatingContainer');
  if (!container) return;
  const buttons = container.querySelectorAll('.star-btn span');
  const label = document.getElementById('ratingLabel');

  const descriptions = {
    1: "1.0 / 5.0 • Not Helpful (उपयुक्त नाही)",
    2: "2.0 / 5.0 • Slightly Helpful (कमी प्रमाणात उपयुक्त)",
    3: "3.0 / 5.0 • Moderately Helpful (मध्यम उपयुक्त)",
    4: "4.0 / 5.0 • Very Helpful (खूप उपयुक्त)",
    5: "5.0 / 5.0 • Highly Relevant (अत्यंत उपयुक्त)"
  };

  buttons.forEach((star, index) => {
    if (index < rating) {
      star.style.fontVariationSettings = "'FILL' 1";
      star.className = "material-symbols-outlined text-3xl text-secondary";
    } else {
      star.style.fontVariationSettings = "'FILL' 0";
      star.className = "material-symbols-outlined text-3xl text-outline-variant";
    }
  });

  if (label) label.innerText = descriptions[rating] || (rating + " / 5.0");
}
window.setRating = setRating;

// ---------------------------------------------------------------------------
// Live data: fetch the dashboard payload and personalize the questionnaire
// ---------------------------------------------------------------------------
let pendingFollowups = [];

async function hydrateFromDashboard() {
  if (!getToken()) {
    showBanner('error', 'Please log in to respond to your follow-up.', 'Session required');
    window.setTimeout(() => {
      window.location.href = 'trainee_login.html';
    }, 900);
    return;
  }

  if (hasOfficerRole()) {
    showBanner('error', 'You are signed in with a Government officer account. Please sign in with your trainee credentials.', 'Wrong portal');
    window.setTimeout(() => { window.location.href = 'trainee_login.html'; }, 1200);
    return;
  }

  showPageSpinner(true, 'Loading your follow-up…');
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

    const data = res.data || {};
    const trainee = data.trainee || {};

    // Personalize the identity blocks with live data
    const nameEl = Array.from(document.querySelectorAll('.font-headline-sm')).find((el) =>
      el.textContent.includes('Jadhav') || el.textContent.trim().split(' ').length >= 2
    );
    if (nameEl && trainee.fullName) nameEl.textContent = trainee.fullName;

    const prnEl = Array.from(document.querySelectorAll('span.font-mono')).find((el) =>
      /^MK-/.test(el.textContent.trim())
    );
    if (prnEl && trainee.prn) prnEl.textContent = trainee.prn;

    pendingFollowups = data.pendingFollowups || [];

    if (pendingFollowups.length === 0) {
      // App Flow §11: hide the alert strip logic — here we keep the form but
      // show an honest notice that nothing is pending, and disable submission.
      showBanner(
        'info',
        'You have no pending follow-up questionnaires right now. Your next statutory follow-up will appear here when the window opens.',
        'Nothing pending'
      );
      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-40');
        submitBtn.title = 'No pending follow-up to respond to.';
      }
    } else {
      // Surface the REAL question text in the strip
      const strip = document.querySelector('.font-label-md.text-label-md.text-primary');
      if (strip && pendingFollowups[0].question) {
        strip.textContent = pendingFollowups[0].question;
      }
    }
  } catch (err) {
    showApiError(err);
  } finally {
    showPageSpinner(false);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const successNotice = document.getElementById('successNotice');

  if (!getToken()) {
    showBanner('error', 'Please log in before submitting your response.', 'Session required');
    window.location.href = 'trainee_login.html';
    return;
  }

  if (pendingFollowups.length === 0) {
    showBanner('info', 'There is no pending follow-up to respond to.', 'Nothing pending');
    return;
  }

  if (!document.querySelector('input[name="employment_status"]:checked')?.value) {
    showBanner('error', 'Select your current employment status before submitting.', 'Missing selection');
    return;
  }

  const branch = document.querySelector('input[name="employment_status"]:checked').value;
  const rating = document.getElementById('selectedRating')?.value || '5';

  // Compose a structured response text for the registry
  let responseText = '';
  let outcomePayload = null;

  if (branch === 'same_company') {
    responseText = `Still employed at the same organization. Current salary: ${val('currentSalary') || 'not stated'}. Skill relevance: ${rating}/5.`;
  } else if (branch === 'changed_job') {
    const newEmployer = val('newEmployerName') || '';
    if (!newEmployer) {
      showBanner('error', 'Enter your new employer name.', 'Missing details');
      return;
    }
    responseText = `Changed job. New employer: ${newEmployer}; salary: ${val('newSalary') || 'not stated'}; location: ${val('newLocation') || 'not stated'}; joining: ${val('newDoj') || 'not stated'}. Skill relevance: ${rating}/5.`;
    outcomePayload = {
      status: 'employed',
      outcomeType: 'wage_employment',
      employerName: newEmployer,
      monthlySalary: Number((val('newSalary') || '').replace(/[^\d.]/g, '')) || undefined,
      joiningDate: val('newDoj') || undefined,
      workLocation: val('newLocation') || undefined,
    };
  } else if (branch === 'self_employed') {
    const enterprise = val('enterpriseName') || '';
    responseText = `Self-employed. Enterprise: ${enterprise || 'not stated'}; income: ${val('selfIncome') || 'not stated'}; Udyam/license: ${val('udyamNumber') || 'not stated'}. Skill relevance: ${rating}/5.`;
    if (enterprise) {
      outcomePayload = {
        status: 'self_employed',
        outcomeType: 'self_employment',
        employerName: enterprise,
        monthlySalary: Number((val('selfIncome') || '').replace(/[^\d.]/g, '')) || undefined,
      };
    }
  } else if (branch === 'seeking_job') {
    responseText = `Not currently working — requesting district placement support. Skill relevance: ${rating}/5.`;
  }

  const remarksEl = document.querySelector('textarea');
  if (remarksEl && remarksEl.value.trim()) {
    responseText += ` Comments: ${remarksEl.value.trim()}`;
  }

  setButtonLoading(submitBtn, true, 'Securing 6-Month Record…');
  showPageSpinner(true, 'Submitting your response…');

  try {
    // 1) Close the pending follow-up
    const respondRes = await api.respondToFollowup({
      followupId: pendingFollowups[0].id,
      response: responseText,
    });

    if (!respondRes.ok) {
      showBanner('error', respondRes.message, `Submission failed (${respondRes.status})`);
      setButtonLoading(submitBtn, false);
      return;
    }

    // 2) If the trainee reported a changed outcome, file a new claim
    if (outcomePayload) {
      const outcomeRes = await api.submitOutcome(outcomePayload);
      if (!outcomeRes.ok) {
        showBanner(
          'info',
          `Your follow-up response was recorded, but the new outcome claim could not be filed: ${outcomeRes.message}`,
          'Outcome claim not filed'
        );
      }
    }

    // 3) Success state (per the design's success card)
    submitBtn.classList.add('hidden');
    successNotice.classList.remove('hidden');
    successNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    showApiError(err);
  } finally {
    setButtonLoading(submitBtn, false);
    showPageSpinner(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('followupForm');
  if (form) {
    form.removeAttribute('onsubmit');
    form.addEventListener('submit', handleFormSubmit);
  }
  hydrateFromDashboard();
});
