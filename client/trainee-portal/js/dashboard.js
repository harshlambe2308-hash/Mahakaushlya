import { api } from './api.js';
import { getToken } from '../../shared/auth.js';
import { showApiError, showBanner, showPageSpinner, wireInternalLinks } from './ui.js';

function pick(obj, paths, fallback = '—') {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.textContent = String(value);
}

function formatAlerts(data) {
  const followups = data.pendingFollowups || [];
  if (Array.isArray(followups) && followups.length) {
    return followups
      .map((f) => f.question || f.title || 'Pending follow-up response requested.')
      .filter(Boolean)
      .join(' ');
  }
  const alerts = data.alerts || data.notifications || [];
  if (Array.isArray(alerts) && alerts.length) {
    return alerts
      .map((item) => (typeof item === 'string' ? item : item.message || item.title))
      .filter(Boolean)
      .join(' ');
  }
  return 'No outstanding alerts. Your next statutory follow-up will appear here when the window opens.';
}

function applyDashboard(payload) {
  // Envelope: { trainee, latestOutcome, outcomeCount, pendingFollowups }
  const data = { ...(payload || {}) };
  const trainee = data.trainee || {};

  setText('dash-trainee-name', pick(trainee, ['fullName', 'full_name', 'name'], 'Trainee'));
  setText('dash-enrollment-id', pick(trainee, ['prn', 'enrollmentId', 'id'], '—'));
  setText(
    'dash-course-name',
    pick(trainee, ['courseName', 'course_name', 'trade'], '—')
  );

  const status = pick(
    data.latestOutcome || {},
    ['status', 'employmentStatus', 'outcomeType'],
    'Pending'
  );
  setText('dash-placement-status', String(status).replace(/_/g, ' '));

  const employer = pick(data.latestOutcome || {}, ['employerName', 'employer'], '');
  if (employer) setText('dash-employer-name', employer);

  const wage = pick(data.latestOutcome || {}, ['monthlySalary', 'monthlyWage'], '');
  if (wage) setText('dash-monthly-wage', `₹${Number(wage).toLocaleString('en-IN')}`);

  setText('dash-alerts', formatAlerts(data));
}

document.addEventListener('DOMContentLoaded', async () => {
  wireInternalLinks();

  if (!getToken()) {
    showBanner('error', 'Please log in to view your dashboard.', 'Session required');
    window.setTimeout(() => {
      window.location.href = 'trainee_login.html';
    }, 800);
    return;
  }

  showPageSpinner(true, 'Loading dashboard…');
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
    applyDashboard(res.data);
  } catch (err) {
    showApiError(err);
  } finally {
    showPageSpinner(false);
  }
});
