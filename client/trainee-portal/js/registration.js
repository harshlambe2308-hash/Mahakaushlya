  function updateTimestamp() {
    const now = new Date();
    const dateStr = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });
    const el = document.getElementById('liveTimestamp');
    if (el) {
      el.textContent = dateStr + ' IST';
    }
  }
  updateTimestamp();
  setInterval(updateTimestamp, 1000);

  function sendOtpNotification() {
    const mobileInput = document.getElementById('mobileNumber');
    if (mobileInput && mobileInput.value.length === 10) {
      const otpStatus = document.getElementById('otpStatus');
      otpStatus.innerHTML = '<span class="material-symbols-outlined text-[14px] text-tertiary-fixed-variant">check_circle</span> 6-Digit OTP sent to +91 ' + mobileInput.value;
      otpStatus.classList.add('text-tertiary-fixed-variant');
    } else {
      alert('Please enter a valid 10-digit mobile number first.');
    }
  }

  function handleRegistrationSubmit() {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const displayTTID = document.getElementById('displayTTID');
    if (displayTTID) {
      displayTTID.textContent = 'MH-2025-' + randomNum;
    }
    const modal = document.getElementById('successModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

