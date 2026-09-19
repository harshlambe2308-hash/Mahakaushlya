/**
 * Shared banners, loading state, and nav helpers for Stitch pages.
 */

const BANNER_HOST_ID = 'api-alert-host';

export function ensureBannerHost() {
  let host = document.getElementById(BANNER_HOST_ID);
  if (host) return host;

  host = document.createElement('div');
  host.id = BANNER_HOST_ID;
  host.className = 'w-full mb-space-md';

  const main = document.querySelector('main');
  const first = main?.querySelector(':scope > div') || main;
  if (first) {
    first.prepend(host);
  } else {
    document.body.prepend(host);
  }
  return host;
}

export function hideBanner() {
  const host = document.getElementById(BANNER_HOST_ID);
  if (host) host.innerHTML = '';
}

export function showBanner(kind, message, title) {
  const host = ensureBannerHost();
  const isError = kind === 'error';
  const isSuccess = kind === 'success';

  const palette = isError
    ? 'bg-error-container text-on-error-container border-error'
    : isSuccess
      ? 'bg-tertiary-fixed text-on-tertiary-fixed border-on-tertiary-container'
      : 'bg-secondary-fixed text-on-secondary-fixed border-secondary';

  const icon = isError ? 'error' : isSuccess ? 'check_circle' : 'info';
  const heading =
    title ||
    (isError ? 'Unable to complete this request' : isSuccess ? 'Success' : 'Notice');

  host.innerHTML = `
    <div class="rounded-xl border ${palette} p-space-md shadow-sm flex items-start gap-space-sm" role="alert">
      <span class="material-symbols-outlined text-2xl shrink-0">${icon}</span>
      <div class="flex-1 min-w-0">
        <p class="font-label-lg text-label-lg font-bold">${heading}</p>
        <p class="font-body-sm text-body-sm mt-1">${message}</p>
      </div>
      <button type="button" class="opacity-70 hover:opacity-100" data-dismiss-banner aria-label="Dismiss">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  `;
  host.querySelector('[data-dismiss-banner]')?.addEventListener('click', hideBanner);
  host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function showApiError(err) {
  const status = err?.status;
  if (status !== undefined) {
    const heading =
      status === 400
        ? 'Please correct the highlighted details'
        : status >= 500
          ? 'Server error'
          : status === 401
            ? 'Authentication required'
            : 'Request failed';
    showBanner('error', err?.message || 'Request failed', heading);
    return;
  }
  showBanner('error', err?.message || 'Something went wrong. Please try again.');
}

export function setButtonLoading(button, loading, busyLabel, idleHtml) {
  if (!button) return;
  if (loading) {
    if (!button.dataset.idleHtml) button.dataset.idleHtml = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `
      <span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
      <span>${busyLabel || 'Please wait…'}</span>
    `;
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.innerHTML = idleHtml || button.dataset.idleHtml || button.innerHTML;
  }
}

export function showPageSpinner(visible, label) {
  let overlay = document.getElementById('page-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-loading-overlay';
    overlay.className =
      'fixed inset-0 z-[80] hidden items-center justify-center bg-inverse-surface/45 backdrop-blur-sm';
    overlay.innerHTML = `
      <div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-xl flex flex-col items-center gap-space-sm min-w-[240px]">
        <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        <p class="font-label-lg text-label-lg text-primary" data-spinner-label>Working…</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  const text = overlay.querySelector('[data-spinner-label]');
  if (text && label) text.textContent = label;
  overlay.classList.toggle('hidden', !visible);
  overlay.classList.toggle('flex', visible);
}

const PAGE_HREF = {
  home: 'index.html',
  'trainee-login': 'trainee_login.html',
  'register-trainee': 'trainee_registration.html',
  'trainee-dashboard': 'trainee_dashboard.html',
  'update-outcome-status': 'update_outcome_status.html',
  'follow-up': 'follow_up.html',
  'profile-and-settings': 'profile_settings.html',
};

export function wireInternalLinks() {
  document.querySelectorAll('[data-path]').forEach((el) => {
    const href = PAGE_HREF[el.getAttribute('data-path')];
    if (href) el.setAttribute('href', href);
  });
}

document.addEventListener('DOMContentLoaded', wireInternalLinks);
