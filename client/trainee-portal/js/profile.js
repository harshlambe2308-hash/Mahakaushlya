    function showToast(msg) {
      const toast = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMessage');
      if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
        setTimeout(() => {
          toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        }, 3200);
      }
    }

    function saveAllChanges() {
      const indicator = document.getElementById('saveStateText');
      if (indicator) {
        indicator.textContent = 'Saving parameters...';
        setTimeout(() => {
          indicator.textContent = 'All changes saved to CIDR';
          showToast('Profile and notification preferences updated successfully.');
        }, 600);
      }
    }

    function discardChanges() {
      showToast('Form reset to last committed state.');
    }

    function triggerDownload() {
      showToast('Fetching DigiLocker Signed Credential (PDF)...');
    }

    function triggerAuditDownload() {
      showToast('Compiling Statutory DPDP Audit Package...');
    }

    function openOtpModal() {
      const modal = document.getElementById('otpModal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeOtpModal() {
      const modal = document.getElementById('otpModal');
      if (modal) modal.classList.add('hidden');
    }

    function confirmOtpUpdate() {
      closeOtpModal();
      showToast('OTP verified. Primary phone number updated.');
    }

