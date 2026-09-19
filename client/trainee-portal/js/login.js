  function switchTab(mode) {
    const pwForm = document.getElementById('passwordLoginForm');
    const otpForm = document.getElementById('otpLoginForm');
    const tabPasswordBtn = document.getElementById('tabPasswordBtn');
    const tabOtpBtn = document.getElementById('tabOtpBtn');

    if (mode === 'password') {
      pwForm.classList.remove('hidden');
      pwForm.classList.add('flex');
      otpForm.classList.add('hidden');
      otpForm.classList.remove('flex');

      tabPasswordBtn.className = 'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs bg-surface-container-lowest text-primary shadow-sm font-semibold';
      tabOtpBtn.className = 'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs text-on-surface-variant hover:text-primary';
    } else {
      pwForm.classList.add('hidden');
      pwForm.classList.remove('flex');
      otpForm.classList.remove('hidden');
      otpForm.classList.add('flex');

      tabOtpBtn.className = 'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs bg-surface-container-lowest text-secondary shadow-sm font-semibold';
      tabPasswordBtn.className = 'flex-1 py-space-sm px-space-md font-label-lg text-label-lg rounded-lg transition-all text-center flex items-center justify-center gap-space-xs text-on-surface-variant hover:text-primary';
    }
  }

  function togglePasswordVisibility(fieldId, iconId) {
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

  function triggerAuthSim() {
    const btn = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Authenticating...`;
    setTimeout(() => {
      alert('Authentication successful. Redirecting to Trainee Unified Dashboard...');
      btn.disabled = false;
      btn.innerHTML = `<span>Login to Portal / लॉगिन करा</span><span class="material-symbols-outlined text-[20px]">arrow_forward</span>`;
    }, 1200);
  }

  function triggerOtpSim() {
    alert('Verifying One Time Passcode with MahaKaushal IAM...');
  }

  let countdownInterval = null;
  function sendOtpCounter() {
    const countdownEl = document.getElementById('otpCountdown');
    const resendBtn = document.getElementById('resendLink');
    let timeLeft = 45;
    
    resendBtn.disabled = true;
    resendBtn.classList.add('opacity-50', 'cursor-not-allowed');

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        countdownEl.innerText = 'You can now request a new OTP';
        resendBtn.disabled = false;
        resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        countdownEl.innerText = `Resend code in ${timeLeft}s`;
      }
    }, 1000);

    alert('Security OTP transmitted to entered telephone number.');
  }

  function openForgotPasswordModal() {
    const m = document.getElementById('forgotPwModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
    document.getElementById('modalStep1').classList.remove('hidden');
    document.getElementById('modalStep2').classList.add('hidden');
  }

  function closeForgotPasswordModal() {
    const m = document.getElementById('forgotPwModal');
    m.classList.add('hidden');
    m.classList.remove('flex');
  }

  function sendRecoveryOtp() {
    document.getElementById('modalStep1').classList.add('hidden');
    document.getElementById('modalStep2').classList.remove('hidden');
    document.getElementById('modalStep2').classList.add('flex');
  }

  function completePasswordReset() {
    alert('Your credentials have been securely reset. Please log in with the new password.');
    closeForgotPasswordModal();
  }

  function openIdLookupModal() {
    const m = document.getElementById('idLookupModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
  }

  function closeIdLookupModal() {
    const m = document.getElementById('idLookupModal');
    m.classList.add('hidden');
    m.classList.remove('flex');
  }

