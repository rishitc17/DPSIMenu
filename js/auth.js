/**
 * Authentication — handles all login flows:
 * 1. Email check → determine flow
 * 2a. Admin login (fixed password, no change)
 * 2b. First-time student login (temp pw → set new pw)
 * 2c. Returning student login
 */

(function () {
  // ── Session helpers ──────────────────────────────────
  function setSession(user) {
    sessionStorage.setItem('dps_user', JSON.stringify(user));
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem('dps_user'));
    } catch { return null; }
  }

  // Redirect if already logged in
  const session = getSession();
  if (session) {
    window.location.href = session.is_admin ? 'admin.html' : 'vote.html';
  }

  // ── UI helpers ───────────────────────────────────────
  function showStep(id) {
    ['step-email', 'step-first-login', 'step-login', 'step-admin-login'].forEach(s => {
      const el = document.getElementById(s);
      el.style.display = s === id ? '' : 'none';
    });
    // Animate card in
    const card = document.getElementById(id);
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'cardIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }

  function showLoading(text = 'Please wait…') {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-text').textContent = text;
  }

  function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  function setError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearErrors() {
    document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.7' : '';
  }

  // ── Password show/hide ───────────────────────────────
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // ── State ────────────────────────────────────────────
  let currentEmail = '';
  let currentUserRow = null;

  // ── Step 1: Email → determine flow ───────────────────
  const emailInput = document.getElementById('email-input');
  const emailNextBtn = document.getElementById('email-next-btn');

  emailNextBtn.addEventListener('click', handleEmailStep);
  emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleEmailStep(); });

  async function handleEmailStep() {
    clearErrors();
    const email = emailInput.value.trim().toLowerCase();
    if (!email) return setError('email-error', 'Please enter your email address.');
    if (!email.includes('@')) return setError('email-error', 'Please enter a valid email address.');

    // Admin shortcut
    if (email === CONFIG.ADMIN_EMAIL) {
      currentEmail = email;
      showStep('step-admin-login');
      setTimeout(() => document.getElementById('admin-password-input').focus(), 100);
      return;
    }

    showLoading('Checking your account…');
    setLoading(emailNextBtn, true);
    try {
      const rows = await DB.select('users', '*', { email: `eq.${email}` });
      if (!rows || rows.length === 0) {
        hideLoading();
        setError('email-error', 'No account found with this email. Please check and try again.');
        return;
      }
      currentUserRow = rows[0];
      currentEmail = email;
      hideLoading();

      if (!currentUserRow.password_changed) {
        showStep('step-first-login');
        setTimeout(() => document.getElementById('temp-password-input').focus(), 100);
      } else {
        const name = parseNameFromEmail(email);
        document.getElementById('login-name-label').textContent = `Welcome back, ${name.first}!`;
        showStep('step-login');
        setTimeout(() => document.getElementById('login-password-input').focus(), 100);
      }
    } catch (err) {
      hideLoading();
      setError('email-error', `Error: ${err.message}`);
    } finally {
      setLoading(emailNextBtn, false);
    }
  }

  // ── Back buttons ─────────────────────────────────────
  document.getElementById('back-from-first').addEventListener('click', () => showStep('step-email'));
  document.getElementById('back-from-login').addEventListener('click', () => showStep('step-email'));
  document.getElementById('back-from-admin').addEventListener('click', () => showStep('step-email'));

  // ── Step 2a: Admin login ─────────────────────────────
  const adminPwInput = document.getElementById('admin-password-input');
  const adminLoginBtn = document.getElementById('admin-login-btn');

  adminLoginBtn.addEventListener('click', handleAdminLogin);
  adminPwInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdminLogin(); });

  async function handleAdminLogin() {
    clearErrors();
    const pw = adminPwInput.value;
    if (!pw) return setError('admin-pw-error', 'Please enter the admin password.');

    if (pw !== CONFIG.ADMIN_PASSWORD) {
      return setError('admin-pw-error', 'Incorrect admin password.');
    }

    setSession({ email: CONFIG.ADMIN_EMAIL, is_admin: true, name: 'Admin' });
    window.location.href = 'admin.html';
  }

  // ── Step 2b: First-time login ─────────────────────────
  const firstLoginBtn = document.getElementById('first-login-btn');
  firstLoginBtn.addEventListener('click', handleFirstLogin);

  async function handleFirstLogin() {
    clearErrors();
    const tempPw = document.getElementById('temp-password-input').value;
    const newPw = document.getElementById('new-password-input').value;
    const confirmPw = document.getElementById('confirm-password-input').value;

    if (!tempPw) return setError('temp-pw-error', 'Enter your temporary password.');
    if (!newPw) return setError('new-pw-error', 'Create a new password.');
    if (newPw.length < 6) return setError('new-pw-error', 'Password must be at least 6 characters.');
    if (newPw !== confirmPw) return setError('confirm-pw-error', 'Passwords do not match.');

    showLoading('Setting up your account…');
    setLoading(firstLoginBtn, true);
    try {
      // Verify temp password
      const match = await Crypto.verify(tempPw, currentUserRow.password_hash);
      if (!match) {
        hideLoading();
        setLoading(firstLoginBtn, false);
        return setError('temp-pw-error', 'Incorrect temporary password.');
      }

      // Hash and store new password
      const newHash = await Crypto.hash(newPw);
      await DB.update('users', { password_hash: newHash, password_changed: true }, 'id', currentUserRow.id);

      // Set session and redirect
      const name = parseNameFromEmail(currentEmail);
      setSession({ id: currentUserRow.id, email: currentEmail, name: `${name.first} ${name.last}`.trim(), is_admin: false });
      window.location.href = 'vote.html';
    } catch (err) {
      hideLoading();
      setLoading(firstLoginBtn, false);
      setError('temp-pw-error', `Error: ${err.message}`);
    }
  }

  // ── Step 2c: Returning login ──────────────────────────
  const loginPwInput = document.getElementById('login-password-input');
  const loginBtn = document.getElementById('login-btn');

  loginBtn.addEventListener('click', handleLogin);
  loginPwInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

  async function handleLogin() {
    clearErrors();
    const pw = loginPwInput.value;
    if (!pw) return setError('login-pw-error', 'Please enter your password.');

    showLoading('Signing you in…');
    setLoading(loginBtn, true);
    try {
      const match = await Crypto.verify(pw, currentUserRow.password_hash);
      if (!match) {
        hideLoading();
        setLoading(loginBtn, false);
        return setError('login-pw-error', 'Incorrect password. Please try again.');
      }

      const name = parseNameFromEmail(currentEmail);
      setSession({ id: currentUserRow.id, email: currentEmail, name: `${name.first} ${name.last}`.trim(), is_admin: false });
      window.location.href = 'vote.html';
    } catch (err) {
      hideLoading();
      setLoading(loginBtn, false);
      setError('login-pw-error', `Error: ${err.message}`);
    }
  }

  // Focus email on load
  emailInput.focus();
})();
