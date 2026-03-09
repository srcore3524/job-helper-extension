// ============================================================
// Side Panel Logic - Job Helper AI
// ============================================================

(function () {
  'use strict';

  const DEFAULT_API_BASE = 'http://localhost:3000';

  // --------------------------------------------------
  // State
  // --------------------------------------------------
  let currentJobData = null; // raw extracted data from content script
  let currentAnalysis = null; // analysis result from API
  let currentJobId = null; // saved job record ID

  // --------------------------------------------------
  // DOM references
  // --------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const logoutBtn = $('#logoutBtn');
  const applicantSelect = $('#applicantSelect');
  const tabBtns = $$('.tab-btn');
  const tabContents = $$('.tab-content');

  // Job tab
  const jobPlaceholder = $('#jobPlaceholder');
  const jobResults = $('#jobResults');
  const jobTitle = $('#jobTitle');
  const jobCompany = $('#jobCompany');
  const statusBtns = $$('.status-btn');
  const jobLocation = $('#jobLocation');
  const jobRemote = $('#jobRemote');
  const remoteCard = $('#remoteCard');
  const jobHiring = $('#jobHiring');
  const matchBar = $('#matchBar');
  const matchPercent = $('#matchPercent');
  const jobSummary = $('#jobSummary');
  const skillsGrid = $('#skillsGrid');
  const linksSection = $('#linksSection');
  const externalLinks = $('#externalLinks');
  const jobQuestionInput = $('#jobQuestionInput');
  const jobGenerateBtn = $('#jobGenerateBtn');
  const jobAnswerArea = $('#jobAnswerArea');
  const jobAnswerText = $('#jobAnswerText');
  const jobCopyBtn = $('#jobCopyBtn');

  // Upwork tab
  const upworkInput = $('#upworkInput');
  const upworkAnalyzeBtn = $('#upworkAnalyzeBtn');
  const upworkResults = $('#upworkResults');
  const upworkLocation = $('#upworkLocation');
  const upworkRemote = $('#upworkRemote');
  const upworkRemoteCard = $('#upworkRemoteCard');
  const upworkHiring = $('#upworkHiring');
  const upworkMatchBar = $('#upworkMatchBar');
  const upworkMatchPercent = $('#upworkMatchPercent');
  const upworkSummary = $('#upworkSummary');
  const upworkSkillsGrid = $('#upworkSkillsGrid');
  const upworkBidText = $('#upworkBidText');
  const upworkBidCopy = $('#upworkBidCopy');
  const upworkQuestionInput = $('#upworkQuestionInput');
  const upworkGenerateBtn = $('#upworkGenerateBtn');
  const upworkAnswerArea = $('#upworkAnswerArea');
  const upworkAnswerText = $('#upworkAnswerText');
  const upworkCopyBtn = $('#upworkCopyBtn');

  // Loading
  const loadingOverlay = $('#loadingOverlay');
  const loadingText = $('#loadingText');

  // --------------------------------------------------
  // Utility: get API base URL from storage
  // --------------------------------------------------
  async function getApiBase() {
    const result = await chrome.storage.local.get('apiBaseUrl');
    return result.apiBaseUrl || DEFAULT_API_BASE;
  }

  // --------------------------------------------------
  // Utility: get JWT token from storage
  // --------------------------------------------------
  async function getToken() {
    const result = await chrome.storage.local.get('jwtToken');
    return result.jwtToken || null;
  }

  // --------------------------------------------------
  // Utility: direct API call from side panel
  // Side panel runs in extension context so no CORS issues
  // --------------------------------------------------
  async function apiCall(endpoint, method = 'GET', body = null) {
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
      const err = new Error(data.message || data.error || 'Request failed');
      err.status = response.status;
      throw err;
    }

    return data;
  }

  // --------------------------------------------------
  // Utility: show/hide loading
  // --------------------------------------------------
  function showLoading(text = 'Analyzing job description...') {
    loadingText.textContent = text;
    loadingOverlay.style.display = 'flex';
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  // --------------------------------------------------
  // Utility: toast
  // --------------------------------------------------
  function showToast(message, type = '') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast ' + type;
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // --------------------------------------------------
  // Auth check
  // --------------------------------------------------
  async function checkAuth() {
    const token = await getToken();
    if (!token) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['jwtToken', 'userEmail', 'userName']);
    window.location.href = 'login.html';
  });

  // --------------------------------------------------
  // Tab switching
  // --------------------------------------------------
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById('tab-' + tabId).classList.add('active');
    });
  });

  // --------------------------------------------------
  // Fetch applicants
  // --------------------------------------------------
  async function loadApplicants() {
    try {
      const data = await apiCall('/api/applicants');
      const applicants = data.applicants || data.data || data || [];
      applicantSelect.innerHTML = '';

      if (!Array.isArray(applicants) || applicants.length === 0) {
        applicantSelect.innerHTML = '<option value="">No applicants found</option>';
        return;
      }

      applicants.forEach((a) => {
        const opt = document.createElement('option');
        opt.value = a._id || a.id;
        opt.textContent = a.name || a.fullName || a.email || 'Unnamed';
        applicantSelect.appendChild(opt);
      });

      // Restore saved selection
      const stored = await chrome.storage.local.get('selectedApplicant');
      if (stored.selectedApplicant) {
        applicantSelect.value = stored.selectedApplicant;
      }
    } catch (err) {
      if (err.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      applicantSelect.innerHTML = '<option value="">Failed to load</option>';
    }
  }

  // Save applicant selection
  applicantSelect.addEventListener('change', () => {
    chrome.storage.local.set({ selectedApplicant: applicantSelect.value });
  });

  // --------------------------------------------------
  // Display analysis results (Job tab)
  // --------------------------------------------------
  function displayJobResults(analysis, extractedData) {
    jobPlaceholder.style.display = 'none';
    jobResults.style.display = 'block';

    // Title & company
    jobTitle.textContent = analysis.jobTitle || extractedData?.jobTitle || 'Untitled Position';
    jobCompany.textContent = analysis.company || extractedData?.companyName || '';

    // Location
    jobLocation.textContent = analysis.location || 'Not specified';

    // Remote type
    const remote = (analysis.remoteType || analysis.workType || '').toLowerCase();
    jobRemote.textContent = analysis.remoteType || analysis.workType || 'Not specified';
    remoteCard.className = 'info-card';
    if (remote.includes('remote')) remoteCard.classList.add('remote-yes');
    else if (remote.includes('hybrid')) remoteCard.classList.add('remote-hybrid');
    else if (remote.includes('on-site') || remote.includes('onsite')) remoteCard.classList.add('remote-no');

    // Hiring signal
    jobHiring.textContent = analysis.hiringSignal || analysis.urgency || 'Unclear';

    // Match score
    const score = parseInt(analysis.matchScore || analysis.match || 0, 10);
    matchBar.style.width = score + '%';
    matchPercent.textContent = score + '%';
    matchBar.className = 'progress-bar';
    if (score >= 70) matchBar.classList.add('green');
    else if (score >= 40) matchBar.classList.add('yellow');
    else matchBar.classList.add('red');

    // Summary
    jobSummary.textContent = analysis.summary || 'No summary available.';

    // Skills
    skillsGrid.innerHTML = '';
    const matched = analysis.matchedSkills || analysis.skills?.matched || [];
    const missing = analysis.missingSkills || analysis.skills?.missing || [];
    matched.forEach((s) => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge matched';
      badge.textContent = s;
      skillsGrid.appendChild(badge);
    });
    missing.forEach((s) => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge missing';
      badge.textContent = s;
      skillsGrid.appendChild(badge);
    });

    // External links
    const links = analysis.applyLinks || analysis.externalLinks || [];
    if (links.length > 0) {
      linksSection.style.display = 'block';
      externalLinks.innerHTML = '';
      links.forEach((link) => {
        const a = document.createElement('a');
        a.className = 'link-item';
        a.href = typeof link === 'string' ? link : link.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.innerHTML = `
          <svg class="link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          ${typeof link === 'string' ? 'Apply directly' : link.label || 'Apply directly'}
        `;
        externalLinks.appendChild(a);
      });
    } else {
      linksSection.style.display = 'none';
    }

    // Reset status buttons
    statusBtns.forEach((b) => b.classList.remove('active'));
    const statusVal = analysis.status || 'not_applied';
    const activeStatusBtn = document.querySelector(`.status-btn[data-status="${statusVal}"]`);
    if (activeStatusBtn) activeStatusBtn.classList.add('active');
  }

  // --------------------------------------------------
  // Display analysis results (Upwork tab)
  // --------------------------------------------------
  function displayUpworkResults(analysis) {
    upworkResults.style.display = 'block';

    // Location
    upworkLocation.textContent = analysis.location || 'Not specified';

    // Remote
    const remote = (analysis.remoteType || analysis.workType || '').toLowerCase();
    upworkRemote.textContent = analysis.remoteType || analysis.workType || 'Remote';
    upworkRemoteCard.className = 'info-card';
    if (remote.includes('remote') || !remote) upworkRemoteCard.classList.add('remote-yes');
    else if (remote.includes('hybrid')) upworkRemoteCard.classList.add('remote-hybrid');
    else upworkRemoteCard.classList.add('remote-no');

    // Hiring signal
    upworkHiring.textContent = analysis.hiringSignal || analysis.urgency || 'Unclear';

    // Match score
    const score = parseInt(analysis.matchScore || analysis.match || 0, 10);
    upworkMatchBar.style.width = score + '%';
    upworkMatchPercent.textContent = score + '%';
    upworkMatchBar.className = 'progress-bar';
    if (score >= 70) upworkMatchBar.classList.add('green');
    else if (score >= 40) upworkMatchBar.classList.add('yellow');
    else upworkMatchBar.classList.add('red');

    // Summary
    upworkSummary.textContent = analysis.summary || 'No summary available.';

    // Skills
    upworkSkillsGrid.innerHTML = '';
    const matched = analysis.matchedSkills || analysis.skills?.matched || [];
    const missing = analysis.missingSkills || analysis.skills?.missing || [];
    matched.forEach((s) => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge matched';
      badge.textContent = s;
      upworkSkillsGrid.appendChild(badge);
    });
    missing.forEach((s) => {
      const badge = document.createElement('span');
      badge.className = 'skill-badge missing';
      badge.textContent = s;
      upworkSkillsGrid.appendChild(badge);
    });

    // Bid draft
    upworkBidText.textContent = analysis.bidDraft || analysis.coverLetter || 'No bid draft generated.';
  }

  // --------------------------------------------------
  // Status buttons (Job tab)
  // --------------------------------------------------
  statusBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const status = btn.getAttribute('data-status');

      // Update UI
      statusBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Save to DB
      if (currentAnalysis) {
        try {
          const body = {
            applicantId: applicantSelect.value,
            jobTitle: currentAnalysis.jobTitle || currentJobData?.jobTitle || '',
            company: currentAnalysis.company || currentJobData?.companyName || '',
            url: currentJobData?.url || '',
            site: currentJobData?.site || '',
            status: status,
            matchScore: currentAnalysis.matchScore || currentAnalysis.match || 0,
            description: currentJobData?.description?.substring(0, 2000) || ''
          };

          const result = await apiCall('/api/jobs', 'POST', body);
          currentJobId = result._id || result.id || currentJobId;
          showToast('Status saved', 'success');
        } catch (err) {
          showToast('Failed to save status: ' + err.message, 'error');
        }
      }
    });
  });

  // --------------------------------------------------
  // Q&A - Job tab
  // --------------------------------------------------
  jobGenerateBtn.addEventListener('click', async () => {
    const question = jobQuestionInput.value.trim();
    if (!question) {
      showToast('Please enter a question first', 'error');
      return;
    }

    jobGenerateBtn.disabled = true;
    jobGenerateBtn.textContent = 'Generating...';

    try {
      const body = {
        question: question,
        jobDescription: currentJobData?.description || '',
        applicantId: applicantSelect.value,
        jobTitle: currentAnalysis?.jobTitle || currentJobData?.jobTitle || ''
      };

      const result = await apiCall('/api/generate-answer', 'POST', body);
      jobAnswerText.textContent = result.answer || result.response || result.text || 'No answer generated.';
      jobAnswerArea.style.display = 'block';
    } catch (err) {
      showToast('Failed to generate answer: ' + err.message, 'error');
    } finally {
      jobGenerateBtn.disabled = false;
      jobGenerateBtn.textContent = 'Generate Answer';
    }
  });

  jobCopyBtn.addEventListener('click', () => {
    copyToClipboard(jobAnswerText.textContent, jobCopyBtn);
  });

  // --------------------------------------------------
  // Q&A - Upwork tab
  // --------------------------------------------------
  upworkGenerateBtn.addEventListener('click', async () => {
    const question = upworkQuestionInput.value.trim();
    if (!question) {
      showToast('Please enter a question first', 'error');
      return;
    }

    upworkGenerateBtn.disabled = true;
    upworkGenerateBtn.textContent = 'Generating...';

    try {
      const body = {
        question: question,
        jobDescription: upworkInput.value.trim(),
        applicantId: applicantSelect.value,
        type: 'upwork'
      };

      const result = await apiCall('/api/generate-answer', 'POST', body);
      upworkAnswerText.textContent = result.answer || result.response || result.text || 'No answer generated.';
      upworkAnswerArea.style.display = 'block';
    } catch (err) {
      showToast('Failed to generate answer: ' + err.message, 'error');
    } finally {
      upworkGenerateBtn.disabled = false;
      upworkGenerateBtn.textContent = 'Generate Answer';
    }
  });

  upworkCopyBtn.addEventListener('click', () => {
    copyToClipboard(upworkAnswerText.textContent, upworkCopyBtn);
  });

  upworkBidCopy.addEventListener('click', () => {
    copyToClipboard(upworkBidText.textContent, upworkBidCopy);
  });

  // --------------------------------------------------
  // Upwork analyze
  // --------------------------------------------------
  upworkAnalyzeBtn.addEventListener('click', async () => {
    const description = upworkInput.value.trim();
    if (!description) {
      showToast('Please paste a job description first', 'error');
      return;
    }

    showLoading('Analyzing Upwork job...');
    upworkAnalyzeBtn.disabled = true;

    try {
      const body = {
        description: description,
        applicantId: applicantSelect.value,
        type: 'upwork',
        site: 'upwork'
      };

      const result = await apiCall('/api/analyze', 'POST', body);
      displayUpworkResults(result);
    } catch (err) {
      showToast('Analysis failed: ' + err.message, 'error');
    } finally {
      hideLoading();
      upworkAnalyzeBtn.disabled = false;
    }
  });

  // --------------------------------------------------
  // Analyze job from content script data
  // --------------------------------------------------
  async function analyzeJob(payload) {
    currentJobData = payload;
    showLoading('Analyzing job description...');

    try {
      const body = {
        description: payload.description,
        url: payload.url,
        site: payload.site,
        jobTitle: payload.jobTitle,
        companyName: payload.companyName,
        applicantId: applicantSelect.value,
        type: 'job'
      };

      const result = await apiCall('/api/analyze', 'POST', body);
      currentAnalysis = result;
      displayJobResults(result, payload);

      // Switch to Job tab
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="job"]').classList.add('active');
      document.getElementById('tab-job').classList.add('active');
    } catch (err) {
      showToast('Analysis failed: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  }

  // --------------------------------------------------
  // Listen for messages from content script / background
  // --------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'JOB_DATA_FOR_PANEL' && message.payload) {
      analyzeJob(message.payload);
      sendResponse({ received: true });
    }
    return true;
  });

  // --------------------------------------------------
  // Copy to clipboard
  // --------------------------------------------------
  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      const orig = btn.innerHTML;
      btn.innerHTML = btn.innerHTML.replace('Copy', 'Copied!');
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = orig;
      }, 1500);
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  }

  // --------------------------------------------------
  // Init
  // --------------------------------------------------
  async function init() {
    const authed = await checkAuth();
    if (!authed) return;

    await loadApplicants();

    // Check for pending job data (if content script sent data before panel opened)
    chrome.runtime.sendMessage({ type: 'GET_PENDING_JOB' }, (response) => {
      if (response?.data) {
        analyzeJob(response.data);
      }
    });
  }

  init();
})();
