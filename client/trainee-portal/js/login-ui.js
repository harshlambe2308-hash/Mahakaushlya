/**
 * ============================================================
 * MahaKaushal Trainee Portal — Login Page UI (login-ui.js)
 * ============================================================
 * The password login itself is handled by js/auth.js (real API call).
 * This module covers the page chrome:
 *   - Password/OTP tab switching
 *   - Password visibility toggle
 *   - Honest handlers for flows with NO backend: OTP login, Forgot Password
 *     (2-step modal), and Find-ID lookup all say "not available in this
 *     release" instead of alert()-faking success (TRD §3 out-of-scope; PRD §4)
 * ============================================================
 */

export function switchTab(mode) {
  const pwForm = document.getElementById('passwordLoginForm');
  const otpForm = document.getElementById('otpLoginForm');
  const tabPasswordBtn = document.getElementById('tabPasswordBtn');
  const tabOtpBtn = document.getElementById('tabOtpBtn');

  if (mode === 'password') {
    pwForm.classList.remove('hidden');
    pwForm.classList.add('flex');
    otpForm.classList.add('hidden');
    otpForm.classList.remove('flex');

    tabPasswordBtn.className =
      'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs bg-surface-container-lowest text-primary shadow-sm font-semibold';
    tabOtpBtn.className =
      'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs text-on-surface-variant hover:text-primary';
  } else {
    pwForm.classList.add('hidden');
    pwForm.classList.remove('flex');
    otpForm.classList.remove('hidden');
    otpForm.classList.add('flex');

    tabOtpBtn.className =
      'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs bg-surface-container-lowest text-secondary shadow-sm font-semibold';
    tabPasswordBtn.className =
      'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs text-on-surface-variant hover:text-primary';
  }
}
window.switchTab = switchTab;

export function togglePasswordVisibility(fieldId, iconId) {
  const field = document.getElementById(fieldId);
  const icon = document.getElementById(iconId);
  if (!field || !icon) return;

  if (field.type === 'password') {
    field.type = 'text';
    icon.innerText = 'visibility_off';
  } else {
    field.type = 'password';
    icon.innerText = 'visibility';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

// ---------------------------------------------------------------------------
// Honest no-backend flows
// ---------------------------------------------------------------------------

const OTP_NOTICE =
  'OTP login is not available in this release — no SMS gateway is integrated (TRD §9). Please use the Password Access tab.';

export function triggerOtpSim() {
  const mobile = document.getElementById('otpMobileInput')?.value?.trim() || '';
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    alert('Enter your 10-digit registered mobile number first.');
    return;
  }
  alert(OTP_NOTICE);
}
window.triggerOtpSim = triggerOtpSim;

export function sendOtpCounter() {
  alert(OTP_NOTICE);
}
window.sendOtpCounter = sendOtpCounter;

export function openForgotPasswordModal() {
  const m = document.getElementById('forgotPwModal');
  if (!m) return;
  alert(
    'Password reset is not available in this release (no email/SMS service is integrated — TRD §9). Contact your District Verification Cell at 1800-120-8040 to reset your password.'
  );
}
window.openForgotPasswordModal = openForgotPasswordModal;

export function closeForgotPasswordModal() {
  const m = document.getElementById('forgotPwModal');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}
window.closeForgotPasswordModal = closeForgotPasswordModal;

export function sendRecoveryOtp() {
  alert(OTP_NOTICE);
}
window.sendRecoveryOtp = sendRecoveryOtp;

export function completePasswordReset() {
  closeForgotPasswordModal();
}
window.completePasswordReset = completePasswordReset;

export function openIdLookupModal() {
  const m = document.getElementById('idLookupModal');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}
window.openIdLookupModal = openIdLookupModal;

export function closeIdLookupModal() {
  const m = document.getElementById('idLookupModal');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}
window.closeIdLookupModal = closeIdLookupModal;

document.addEventListener('DOMContentLoaded', () => {
  const otpForm = document.getElementById('otpLoginForm');
  if (otpForm) {
    otpForm.removeAttribute('onsubmit');
    otpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      triggerOtpSim();
    });
  }
});
