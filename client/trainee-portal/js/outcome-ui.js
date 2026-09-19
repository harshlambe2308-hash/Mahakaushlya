  function switchBranch(branchId) {
    const branches = ['employed', 'self', 'apprenticeship', 'unemployed'];
    
    // Update tab button styles
    branches.forEach(b => {
      const btn = document.getElementById('btn-branch-' + b);
      const icon = btn.querySelector('.material-symbols-outlined:last-child');
      
      if (b === branchId) {
        btn.className = 'flex flex-col items-start p-space-md rounded-xl text-left transition-all duration-200 bg-primary-container text-on-primary shadow-sm ring-2 ring-secondary-container';
        if (icon) {
          icon.textContent = 'check_circle';
          icon.className = 'material-symbols-outlined text-base';
        }
      } else {
        btn.className = 'flex flex-col items-start p-space-md rounded-xl text-left transition-all duration-200 bg-surface-container-low text-on-surface hover:bg-surface-container';
        if (icon) {
          icon.textContent = 'radio_button_unchecked';
          icon.className = 'material-symbols-outlined text-base text-outline-variant';
        }
      }

      // Toggle Panels
      const panel = document.getElementById('panel-' + b);
      if (panel) {
        if (b === branchId) {
          panel.classList.remove('hidden');
          panel.classList.add('flex');
        } else {
          panel.classList.add('hidden');
          panel.classList.remove('flex');
        }
      }
    });
  }

  function handleSubmit() {
    const decCheck = document.getElementById('declaration-check');
    if (!decCheck.checked) {
      alert('Please accept the statutory legal declaration before submitting.');
      return;
    }
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> <span>Submitting to Ledger...</span>';
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-lg">verified</span> <span>Record Verified & Submitted</span>';
      submitBtn.classList.remove('bg-primary');
      submitBtn.classList.add('bg-tertiary-container', 'text-white');
      
      // Show Toast
      const toast = document.getElementById('toast-success');
      toast.classList.remove('translate-y-32', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    }, 900);
  }

  function hideToast() {
    const toast = document.getElementById('toast-success');
    toast.classList.add('translate-y-32', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }

