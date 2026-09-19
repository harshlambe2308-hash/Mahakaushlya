import { loginAndPersist, registerAndPersist } from './api.js';
import { isLoggedIn } from '../../shared/auth.js';
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

    const ttid = res.data?.prn || res.data?.traineeId || res.data?.id || '—';
    const display = document.getElementById('displayTTID');
    if (display && ttid) display.textContent = ttid;
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.remove('hidden');
    window.setTimeout(() => {
      window.location.href = 'trainee_dashboard.html';
    }, 1200);
  } catch (err) {
    setButtonLoading(btn, false);
    showApiError(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  wireInternalLinks();

  // Already logged in? Go straight to the dashboard.
  if (isLoggedIn() && document.getElementById('passwordLoginForm')) {
    window.location.href = 'trainee_dashboard.html';
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

  const candidateBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    /Candidate Registration/i.test(b.textContent || '')
  );
  if (candidateBtn) {
    candidateBtn.addEventListener('click', () => {
      window.location.href = 'trainee_registration.html';
    });
  }
});
