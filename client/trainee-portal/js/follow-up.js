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

  function setRating(rating) {
    document.getElementById('selectedRating').value = rating;
    const container = document.getElementById('starRatingContainer');
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

    label.innerText = descriptions[rating] || (rating + " / 5.0");
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const successNotice = document.getElementById('successNotice');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
      <span>Securing 6-Month Record...</span>
    `;

    setTimeout(() => {
      submitBtn.classList.add('hidden');
      successNotice.classList.remove('hidden');
      successNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 900);
  }

