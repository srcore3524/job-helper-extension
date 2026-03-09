// ============================================================
// Login Page Logic - Job Helper AI
// ============================================================

(function () {
  'use strict';

  const DEFAULT_API_BASE = 'http://localhost:3000';

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const btnText = loginBtn.querySelector('.btn-text');
  const btnLoader = loginBtn.querySelector('.btn-loader');
  const errorMsg = document.getElementById('errorMsg');

  const settingsLink = document.getElementById('settingsLink');
  const settingsModal = document.getElementById('settingsModal');
  const apiUrlInput = document.getElementById('apiUrl');
  const saveSettings = document.getElementById('saveSettings');
  const cancelSettings = document.getElementById('cancelSettings');

  // Check if already logged in
  chrome.storage.local.get('jwtToken', (result) => {
    if (result.jwtToken) {
      window.location.href = 'sidepanel.html';
    }
  });

  // Load saved API URL
  chrome.storage.local.get('apiBaseUrl', (result) => {
    apiUrlInput.value = result.apiBaseUrl || DEFAULT_API_BASE;
  });

  // Settings modal
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    settingsModal.style.display = 'flex';
  });

  cancelSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  saveSettings.addEventListener('click', () => {
    const url = apiUrlInput.value.trim().replace(/\/+$/, '');
    if (url) {
      chrome.storage.local.set({ apiBaseUrl: url });
    }
    settingsModal.style.display = 'none';
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
  });

  // Show/hide error
  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }

  function hideError() {
    errorMsg.style.display = 'none';
  }

  function setLoading(loading) {
    loginBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoader.style.display = loading ? 'inline' : 'none';
  }

  // Login
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await chrome.storage.local.get('apiBaseUrl');
      const apiBase = result.apiBaseUrl || DEFAULT_API_BASE;

      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid credentials');
      }

      const token = data.token || data.accessToken || data.jwt;
      if (!token) {
        throw new Error('No token received from server');
      }

      // Save token and optional user info
      await chrome.storage.local.set({
        jwtToken: token,
        userEmail: email,
        userName: data.name || data.user?.name || ''
      });

      window.location.href = 'sidepanel.html';
    } catch (err) {
      showError(err.message || 'Login failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  });
})();
