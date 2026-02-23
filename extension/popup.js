// MyJob Browser Extension - Popup Script

const $ = (id) => document.getElementById(id);

let extractedData = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const settings = await getSettings();

  // Load settings fields
  if (settings.backendUrl) $('backendUrl').value = settings.backendUrl;
  if (settings.authToken) $('authToken').value = settings.authToken;

  // Check if configured
  if (!settings.backendUrl || !settings.authToken) {
    $('notConfigured').style.display = 'block';
    $('configuredPanel').style.display = 'none';
  } else {
    $('notConfigured').style.display = 'none';
    $('configuredPanel').style.display = 'block';
    loadCurrentTab();
    loadHistory(settings);
  }
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendUrl', 'authToken', 'savedJobs'], (result) => {
      resolve(result);
    });
  });
}

// ─── Current Tab ──────────────────────────────────────────────────────────────
async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    $('currentUrl').textContent = tab.url;
    $('currentUrl').title = tab.url;
  }
}

// ─── Extract Job ──────────────────────────────────────────────────────────────
async function extractJob() {
  const settings = await getSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || tab.url.startsWith('chrome://')) {
    showError('Cannot access this page. Navigate to a job posting first.');
    return;
  }

  showLoading('Analyzing job posting with AI...');
  hideError();

  try {
    const response = await fetch(`${settings.backendUrl}/api/scrape-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.authToken}`
      },
      body: JSON.stringify({ url: tab.url })
    });

    if (response.status === 401) {
      showError('Invalid auth token. Go to Settings and update it.');
      hideLoading();
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${response.status}`);
    }

    extractedData = await response.json();
    extractedData._sourceUrl = tab.url;

    // Populate card
    $('fieldCompany').textContent = extractedData.company || '—';
    $('fieldRole').textContent = extractedData.role || '—';
    $('fieldLocation').textContent = extractedData.location || '—';
    $('fieldSalary').textContent = extractedData.salary_range || '—';
    $('cardUrl').textContent = tab.url;

    $('extractedCard').style.display = 'block';
    $('extractBtn').style.display = 'none';
    $('saveBtn').style.display = 'flex';

    hideLoading();
  } catch (err) {
    hideLoading();
    showError(err.message || 'Could not extract job details from this page.');
  }
}

// ─── Save Job ──────────────────────────────────────────────────────────────────
async function saveJob() {
  if (!extractedData) return;

  const settings = await getSettings();
  showLoading('Saving to MyJob...');

  const payload = {
    company: extractedData.company || 'Unknown',
    role: extractedData.role || 'Unknown',
    status: $('statusSelect').value,
    location: extractedData.location || null,
    salary_range: extractedData.salary_range || null,
    url: extractedData._sourceUrl,
    notes: extractedData.notes || null,
    tech_stack: extractedData.tech_stack || []
  };

  try {
    const response = await fetch(`${settings.backendUrl}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.authToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to save');

    const saved = await response.json();

    // Store in local history
    const existing = settings.savedJobs || [];
    existing.unshift({ company: payload.company, role: payload.role, url: payload.url, savedAt: new Date().toISOString() });
    chrome.storage.local.set({ savedJobs: existing.slice(0, 20) });

    hideLoading();
    showSuccess(`${payload.role} at ${payload.company}`);
  } catch (err) {
    hideLoading();
    showError('Failed to save. Check your connection and token.');
  }
}

// ─── History ──────────────────────────────────────────────────────────────────
function loadHistory(settings) {
  const jobs = settings.savedJobs || [];
  const container = $('historyList');

  if (jobs.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px 16px;color:#8E8E93;font-size:13px">No saved jobs yet.<br/>Use "Save Job" to get started.</div>`;
    return;
  }

  container.innerHTML = jobs.map(j => `
    <div style="background:#fff;border:1px solid #E5E5EA;border-radius:10px;padding:10px 12px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:600;color:#1D1D1F">${j.role}</div>
      <div style="font-size:11px;color:#6E6E73;margin-top:1px">${j.company}</div>
      <div style="font-size:10px;color:#8E8E93;margin-top:3px">${new Date(j.savedAt).toLocaleDateString()}</div>
    </div>
  `).join('');
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showLoading(text) {
  $('loadingText').textContent = text;
  $('loadingState').style.display = 'flex';
  $('formState').style.display = 'none';
  $('successState').style.display = 'none';
}
function hideLoading() {
  $('loadingState').style.display = 'none';
  $('formState').style.display = 'block';
}
function showSuccess(detail) {
  $('successDetail').textContent = detail;
  $('successState').style.display = 'flex';
  $('formState').style.display = 'none';
  $('loadingState').style.display = 'none';
}
function showError(msg) {
  $('errorBanner').textContent = msg;
  $('errorBanner').style.display = 'block';
}
function hideError() {
  $('errorBanner').style.display = 'none';
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
$('extractBtn').addEventListener('click', extractJob);
$('saveBtn').addEventListener('click', saveJob);

$('saveAnother').addEventListener('click', () => {
  extractedData = null;
  $('extractedCard').style.display = 'none';
  $('extractBtn').style.display = 'flex';
  $('saveBtn').style.display = 'none';
  $('successState').style.display = 'none';
  $('formState').style.display = 'block';
  hideError();
});

$('settingsToggle').addEventListener('click', () => {
  const isSettings = $('settingsPanel').classList.contains('active');
  if (isSettings) {
    $('settingsPanel').classList.remove('active');
    $('mainPanel').classList.remove('hidden');
  } else {
    $('settingsPanel').classList.add('active');
    $('mainPanel').classList.add('hidden');
  }
});

$('goToSettings').addEventListener('click', () => {
  $('settingsPanel').classList.add('active');
  $('mainPanel').classList.add('hidden');
});

$('saveSettings').addEventListener('click', () => {
  const backendUrl = $('backendUrl').value.trim().replace(/\/$/, '');
  const authToken = $('authToken').value.trim();
  chrome.storage.local.set({ backendUrl, authToken }, () => {
    $('settingsPanel').classList.remove('active');
    $('mainPanel').classList.remove('hidden');
    init();
  });
});

// Copy token button
$('copyTokenBtn').addEventListener('click', async () => {
  const tokenValue = $('authToken').value.trim();
  if (!tokenValue) {
    showError('No token to copy. Please paste your token first.');
    setTimeout(() => hideError(), 2000);
    return;
  }

  try {
    await navigator.clipboard.writeText(tokenValue);
    const btn = $('copyTokenBtn');
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>`;
    }, 1500);
  } catch (err) {
    showError('Failed to copy. Please copy manually.');
    setTimeout(() => hideError(), 2000);
  }
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    $('tabContentSave').style.display = target === 'save' ? 'block' : 'none';
    $('tabContentHistory').style.display = target === 'history' ? 'block' : 'none';
    if (target === 'history') {
      getSettings().then(loadHistory);
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
init();
