// ============================================================
// Background Service Worker - Job Helper AI
// ============================================================

const DEFAULT_API_BASE = 'http://localhost:3000';

// Open side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Allow side panel to open on all pages
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// --------------------------------------------------
// Utility: get stored API base URL
// --------------------------------------------------
async function getApiBase() {
  const result = await chrome.storage.local.get('apiBaseUrl');
  return result.apiBaseUrl || DEFAULT_API_BASE;
}

// --------------------------------------------------
// Utility: get stored JWT
// --------------------------------------------------
async function getToken() {
  const result = await chrome.storage.local.get('jwtToken');
  return result.jwtToken || null;
}

// --------------------------------------------------
// Generic API call handler
// --------------------------------------------------
async function apiCall(endpoint, method, body) {
  const apiBase = await getApiBase();
  const token = await getToken();

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${apiBase}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw { status: response.status, message: data.message || data.error || 'Request failed' };
  }
  return data;
}

// --------------------------------------------------
// Message listener
// --------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'API_CALL') {
    const { endpoint, method, body } = message;
    apiCall(endpoint, method || 'GET', body)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || 'Request failed', status: err.status }));
    return true; // keep channel open for async response
  }

  if (message.type === 'JOB_DATA_EXTRACTED') {
    // Always store the data so the side panel can pick it up
    chrome.storage.local.set({ pendingJobData: message.payload });
    // Also try to forward directly to the side panel
    chrome.runtime.sendMessage({
      type: 'JOB_DATA_FOR_PANEL',
      payload: message.payload
    }).catch(() => {});
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_PENDING_JOB') {
    chrome.storage.local.get('pendingJobData', (result) => {
      sendResponse({ data: result.pendingJobData || null });
      if (result.pendingJobData) {
        chrome.storage.local.remove('pendingJobData');
      }
    });
    return true;
  }
});
