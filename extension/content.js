(function () {
  'use strict';

  if (document.getElementById('job-helper-fab')) return;
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;

  const hostname = window.location.hostname;

  function detectSite() {
    const sites = {
      'linkedin.com': 'LinkedIn', 'indeed.com': 'Indeed', 'glassdoor.com': 'Glassdoor',
      'ziprecruiter.com': 'ZipRecruiter', 'dice.com': 'Dice', 'wellfound.com': 'AngelList',
      'angel.co': 'AngelList', 'remoteok.com': 'RemoteOK', 'remoteok.io': 'RemoteOK',
      'weworkremotely.com': 'WeWorkRemotely', 'stackoverflow.com': 'StackOverflow',
      'monster.com': 'Monster', 'careerbuilder.com': 'CareerBuilder',
      'simplyhired.com': 'SimplyHired', 'lever.co': 'Lever', 'greenhouse.io': 'Greenhouse',
      'workday.com': 'Workday', 'myworkdayjobs.com': 'Workday',
      'smartrecruiters.com': 'SmartRecruiters', 'breezy.hr': 'BreezyHR',
      'apply.workable.com': 'Workable', 'bamboohr.com': 'BambooHR',
      'icims.com': 'iCIMS', 'jobvite.com': 'Jobvite', 'ashbyhq.com': 'Ashby',
      'rippling.com': 'Rippling'
    };
    for (const [domain, name] of Object.entries(sites)) {
      if (hostname.includes(domain)) return name;
    }
    const parts = hostname.replace('www.', '').split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  const siteName = detectSite();

  const fab = document.createElement('button');
  fab.id = 'job-helper-fab';
  fab.title = 'Analyze with Job Helper AI';
  fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    #job-helper-fab {
      position: fixed; bottom: 28px; right: 28px; width: 56px; height: 56px;
      border-radius: 50%; background: linear-gradient(135deg, #e94560, #0f3460);
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(233,69,96,0.4); z-index: 999999;
      transition: transform 0.2s, box-shadow 0.2s; animation: jh-pulse 2s infinite;
    }
    #job-helper-fab:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(233,69,96,0.6); }
    @keyframes jh-pulse {
      0%   { box-shadow: 0 4px 16px rgba(233,69,96,0.4); }
      50%  { box-shadow: 0 4px 24px rgba(233,69,96,0.7), 0 0 0 8px rgba(233,69,96,0.15); }
      100% { box-shadow: 0 4px 16px rgba(233,69,96,0.4); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(fab);

  const siteSelectors = {
    LinkedIn: {
      description: ['.jobs-description__content', '.jobs-box__html-content', '.show-more-less-html__markup', '#job-details', '.jobs-description'],
      title: ['.jobs-unified-top-card__job-title', '.t-24.job-details-jobs-unified-top-card__job-title', 'h1.topcard__title'],
      company: ['.jobs-unified-top-card__company-name a', '.topcard__org-name-link']
    },
    Indeed: {
      description: ['#jobDescriptionText', '.jobsearch-jobDescriptionText', '[class*="jobDescription"]'],
      title: ['.jobsearch-JobInfoHeader-title', 'h1[class*="JobTitle"]'],
      company: ['[data-company-name]', '.jobsearch-InlineCompanyRating-companyHeader']
    },
    Glassdoor: {
      description: ['.jobDescriptionContent', '[class*="JobDescription"]', '.desc'],
      title: ['[data-test="job-title"]', 'h1'],
      company: ['[data-test="employer-name"]']
    },
    Greenhouse: {
      description: ['#content', '.job-post-content'],
      title: ['.app-title', 'h1'],
      company: ['.company-name']
    },
    Lever: {
      description: ['.posting-page .content', '.section-wrapper'],
      title: ['.posting-headline h2'],
      company: ['.posting-headline .company']
    },
    Workday: {
      description: ['[data-automation-id="jobPostingDescription"]', '.job-description'],
      title: ['[data-automation-id="jobPostingHeader"]', 'h2'],
      company: ['[data-automation-id="company"]']
    }
  };

  const genericSelectors = {
    description: [
      '[class*="job-description"]', '[class*="jobDescription"]', '[class*="job_description"]',
      '[id*="job-description"]', '[id*="jobDescription"]', '[class*="description"]',
      '[class*="posting-description"]', '[class*="vacancy-description"]',
      'article', '.job-details', '.job-content', '.posting-content', 'main'
    ],
    title: ['h1', '[class*="job-title"]', '[class*="jobTitle"]', '[class*="posting-title"]', 'h2'],
    company: ['[class*="company-name"]', '[class*="companyName"]', '[class*="employer"]', '[class*="organization"]']
  };

  function extractBySelectors(selectors, minLength) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > (minLength || 20)) return el.innerText.trim();
      } catch (e) {}
    }
    return null;
  }

  function extractDescription() {
    const siteConfig = siteSelectors[siteName];
    if (siteConfig) {
      const result = extractBySelectors(siteConfig.description, 50);
      if (result) return result;
    }
    const result = extractBySelectors(genericSelectors.description, 50);
    if (result) return result;
    const body = document.body.innerText;
    return body.length > 200 ? body.substring(0, 8000) : null;
  }

  function extractJobTitle() {
    const siteConfig = siteSelectors[siteName];
    if (siteConfig) {
      const r = extractBySelectors(siteConfig.title, 3);
      if (r) return r.split('\n')[0].trim();
    }
    const r = extractBySelectors(genericSelectors.title, 3);
    return r ? r.split('\n')[0].trim() : document.title || '';
  }

  function extractCompanyName() {
    const siteConfig = siteSelectors[siteName];
    if (siteConfig) {
      const r = extractBySelectors(siteConfig.company, 1);
      if (r) return r.split('\n')[0].trim();
    }
    const r = extractBySelectors(genericSelectors.company, 1);
    return r ? r.split('\n')[0].trim() : '';
  }

  fab.addEventListener('click', () => {
    if (!chrome.runtime?.id) {
      window.location.reload();
      return;
    }

    const description = extractDescription();
    if (!description) {
      alert('Could not extract job description from this page.');
      return;
    }

    chrome.runtime.sendMessage({
      type: 'JOB_DATA_EXTRACTED',
      payload: {
        description,
        url: window.location.href,
        site: siteName,
        jobTitle: extractJobTitle(),
        companyName: extractCompanyName()
      }
    }).catch(() => {
      window.location.reload();
    });

    fab.style.animation = 'none';
    fab.style.background = 'linear-gradient(135deg, #27ae60, #0f3460)';
    setTimeout(() => {
      fab.style.background = 'linear-gradient(135deg, #e94560, #0f3460)';
      fab.style.animation = 'jh-pulse 2s infinite';
    }, 1500);
  });
})();
