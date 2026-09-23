import { adminLogin, showAdminBanner, LOGIN_URL } from './adminApi.js';
import { isLoggedIn } from '../../shared/auth.js';

function wireLogin() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email =
      document.getElementById('adminEmail')?.value?.trim() ||
      document.getElementById('identifierInput')?.value?.trim();
    const password =
      document.getElementById('adminPassword')?.value ||
      document.getElementById('passwordInput')?.value;

    if (!email || !password) {
      showAdminBanner('Enter your official email and password.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHtml = submitBtn?.innerHTML || 'Sign In';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Authenticating…';
    }

    try {
      const res = await adminLogin(email, password);

      if (!res.success) {
        const hint =
          res.status === 401
            ? ' Invalid credentials. (No officer account exists yet? In development, create one via POST /api/admin/dev/seed-admin.)'
            : '';
        showAdminBanner((res.message || 'Login failed.') + hint, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
        }
        return;
      }

      showAdminBanner('Login successful. Loading the divisional dashboard…', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    } catch (err) {
      showAdminBanner(err?.message || 'Unexpected error during login.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }
  wireLogin();
});
