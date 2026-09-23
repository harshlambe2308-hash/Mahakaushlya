import { loginAndPersist, registerAndPersist } from './api.js';
import { isLoggedIn, hasOfficerRole } from '../../shared/auth.js';
import { hideBanner, setButtonLoading, showApiError, showBanner, wireInternalLinks } from './ui.js';

async function handleLogin(event) {
  event.preventDefault();
  hideBanner();

  const email = document.getElementById('loginEmail')?.value?.trim()
    || document.getElementById('identifierInput')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value
    || document.getElementById('passwordInput')?.value;
  const btn = document.getElementById('loginSubmitBtn');

  if (!email || !password) {
    showBanner('error', 'Enter your registered email and password.', 'Missing credentials');
    return;
  }

  setButtonLoading(btn, true, 'Authenticating…');
  try {
    const res = await loginAndPersist({ email, password });

    if (!res.ok) {
      setButtonLoading(btn, false);
      showBanner('error', res.message, res.status === 401 ? 'Invalid credentials' : 'Login failed');
      return;
    }

    const role = res.data?.user?.role;
    if (role && role !== 'trainee') {
      showBanner('error', 'This account is not a trainee account. Use the Admin Portal to sign in.', 'Wrong portal');
      window.MahaAuth?.clearToken?.();
      setButtonLoading(btn, false);
      return;
    }

    window.location.href = 'trainee_dashboard.html';
  } catch (err) {
    setButtonLoading(btn, false);
    showApiError(err);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideBanner();

  const form = event.currentTarget;
  if (form && !form.checkValidity()) {
    form.reportValidity();
    showBanner('error', 'Please complete every required field before submitting.', 'Incomplete registration');
    return;
  }

  const password = document.getElementById('accountPassword')?.value
    || document.getElementById('regPassword')?.value;
  const confirm = document.getElementById('confirmPassword')?.value
    || document.getElementById('regConfirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    showBanner('error', 'Password and confirmation do not match.', 'Password mismatch');
    return;
  }

  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const courseSelect = document.getElementById('courseName');
  const courseLabel = courseSelect?.selectedOptions?.[0]?.text || courseSelect?.value || '';

  const mobile =
    document.getElementById('mobileNumber')?.value?.trim() ||
    document.getElementById('phone')?.value?.trim() ||
    document.getElementById('phoneNumber')?.value?.trim();

  const body = {
    fullName: document.getElementById('fullName')?.value?.trim(),
    email: document.getElementById('emailAddress')?.value?.trim()
      || document.getElementById('email')?.value?.trim(),
    phone: mobile,
    password,
    ageBand: document.getElementById('ageBand')?.value,
    socialCategory: document.getElementById('socialCategory')?.value,
    gender,
    district: document.getElementById('district')?.value,
    trainingScheme: document.getElementById('trainingScheme')?.value,
    courseName: courseLabel,
    courseCode: courseSelect?.value,
    batchId: document.getElementById('batchId')?.value?.trim(),
    completionMonth: document.getElementById('completionMonth')?.value,
    completionYear: document.getElementById('completionYear')?.value,
    consent: Boolean(document.getElementById('statutoryConsent')?.checked),
  };

  const btn = form.querySelector('button[type="submit"]');
  setButtonLoading(btn, true, 'Creating account…');
  try {
    const res = await registerAndPersist(body);

    if (!res.ok) {
      setButtonLoading(btn, false);
      showBanner('error', res.message, 'Registration failed');
      return;
    }

    // Trainee flow: registration must lead back into the authentication flow.
    // The token minted at register time is discarded so the trainee proves the
    // credentials they just created on the Login Page.
    window.MahaAuth?.clearToken?.();

    const ttid = res.data?.prn || res.data?.traineeId || res.data?.id || '—';
    const display = document.getElementById('displayTTID');
    if (display && ttid) display.textContent = ttid;
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.remove('hidden');
  } catch (err) {
    setButtonLoading(btn, false);
    showApiError(err);
  }
}

/**
 * Success-modal wiring for the register page.
 * The modal's primary action now continues into the Login Page (the required
 * trainee flow: Register → Login → Dashboard), and a secondary action returns
 * to the registration form.
 */
function wireRegistrationSuccessModal() {
  const modal = document.getElementById('successModal');
  if (!modal) return;

  modal.querySelectorAll('[data-path="trainee-dashboard"]').forEach((el) => {
    el.removeAttribute('data-path');
    el.setAttribute('href', 'trainee_login.html');
    el.textContent = 'Continue to Login / लॉगिन करा';
  });

  if (!modal.querySelector('[data-auth-back]')) {
    const back = document.createElement('button');
    back.type = 'button';
    back.setAttribute('data-auth-back', '');
    back.className =
      'w-full py-2.5 rounded-lg bg-surface-container-high text-primary text-center font-label-md text-label-md hover:bg-surface-container-highest transition-colors';
    back.textContent = 'Back to Registration';
    back.addEventListener('click', () => modal.classList.add('hidden'));
    const actionsRow = modal.querySelector('div.flex.gap-space-sm.mt-space-sm') || modal;
    actionsRow.classList.add('flex-col');
    actionsRow.appendChild(back);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  wireInternalLinks();
  wireRegistrationSuccessModal();

  // A trainee who is already signed in and opens the Login Page goes straight
  // to their dashboard. Officer accounts are ignored here — they must use the
  // Admin Portal.
  const onLoginPage = /trainee_login\.html$/i.test(window.location.pathname);
  if (onLoginPage && isLoggedIn() && !hasOfficerRole()) {
    window.location.replace('trainee_dashboard.html');
    return;
  }

  const loginForm = document.getElementById('passwordLoginForm');
  if (loginForm) {
    loginForm.removeAttribute('onsubmit');
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registrationForm');
  if (registerForm) {
    registerForm.removeAttribute('onsubmit');
    registerForm.addEventListener('submit', handleRegister);
  }

  // "I don't have an account" strip on the Login Page -> Register Page.
  const registerStripBtn = document.querySelector('#register-strip button[type="button"]');
  if (registerStripBtn) {
    registerStripBtn.addEventListener('click', () => {
      window.location.href = 'trainee_registration.html';
    });
  }
});
