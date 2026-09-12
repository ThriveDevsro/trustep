// FeelsOdd Gmail content script
// Automatically analyzes emails from first-time or suspicious senders.

const API_URL        = 'http://localhost:3000/api/analyze';
const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// How many times a sender must appear in storage before they're "known"
const KNOWN_THRESHOLD = 2;

// ─── State ────────────────────────────────────────────────────────────────────

let lastEmailKey       = null;   // sender+subject fingerprint to skip duplicates
let analysisController = null;   // AbortController for in-flight API request

// ─── Storage helpers (chrome.storage.local) ───────────────────────────────────

function getKnownSenders() {
  return new Promise(resolve => {
    chrome.storage.local.get('knownSenders', r => resolve(r.knownSenders || {}));
  });
}

function recordSender(email) {
  return new Promise(resolve => {
    chrome.storage.local.get('knownSenders', r => {
      const known = r.knownSenders || {};
      known[email] = (known[email] || 0) + 1;
      chrome.storage.local.set({ knownSenders: known }, resolve);
    });
  });
}

async function isNewSender(email) {
  const known = await getKnownSenders();
  return (known[email] || 0) < KNOWN_THRESHOLD;
}

// ─── Gmail DOM extraction ─────────────────────────────────────────────────────

function extractEmailData() {
  const subjectEl    = document.querySelector('h2.hP');
  const subject      = subjectEl?.innerText.trim() ?? '';

  const senderEl     = document.querySelector('.gD');
  const senderEmail  = senderEl?.getAttribute('email') ?? senderEl?.innerText.trim() ?? '';
  const senderNameEl = document.querySelector('.go');
  const senderName   = senderNameEl?.innerText.trim() ?? senderEmail;
  const sender       = senderName ? `${senderName} <${senderEmail}>` : senderEmail;

  // Newest expanded message body only (avoids quoted thread text)
  const bodyEl = document.querySelector('.a3s.aiL') ?? document.querySelector('.ii.gt .a3s');
  const body   = bodyEl?.innerText.trim().slice(0, 3000) ?? '';

  return { subject, sender, senderEmail: senderEmail.toLowerCase(), body };
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function createPanel() {
  if (document.getElementById('truststep-panel')) return;

  const panel = document.createElement('div');
  panel.id    = 'truststep-panel';
  panel.classList.add('ts-hidden');
  panel.innerHTML = `
    <div class="ts-header">
      <div class="ts-logo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#3B82F6"/>
        </svg>
        FeelsOdd
      </div>
      <button class="ts-close" id="ts-close-btn" title="Zavrieť">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="ts-body" id="ts-body"></div>
  `;
  document.body.appendChild(panel);

  document.getElementById('ts-close-btn').addEventListener('click', () => {
    panel.classList.add('ts-hidden');
  });
}

function showPanel()  { document.getElementById('truststep-panel')?.classList.remove('ts-hidden'); }
function hidePanel()  { document.getElementById('truststep-panel')?.classList.add('ts-hidden'); }

function setBody(html) {
  const el = document.getElementById('ts-body');
  if (el) el.innerHTML = html;
}

// ─── Panel states ─────────────────────────────────────────────────────────────

function showNewSenderWarning(senderEmail) {
  setBody(`
    <div class="ts-new-sender">
      <div class="ts-new-sender-icon">👤</div>
      <strong>Neznámy odosielateľ</strong>
      <p>${escHtml(senderEmail)}</p>
      <p class="ts-muted">Prvýkrát videná adresa. Spúšťam analýzu...</p>
      <div class="ts-spinner" style="margin:12px auto 0"></div>
    </div>
  `);
  showPanel();
}

function showLoading() {
  setBody(`
    <div class="ts-loading">
      <div class="ts-spinner"></div>
      Analyzujem e-mail...
    </div>
  `);
  showPanel();
}

function showResult({ riskLevel, reasons, requestId, senderEmail, autoTriggered }) {
  const emoji = { low: '🟢', medium: '🟡', high: '🔴' }[riskLevel] ?? '⚪';
  const label = { low: 'Nízke riziko', medium: 'Stredné riziko', high: 'Vysoké riziko' }[riskLevel] ?? riskLevel;

  const autoTag = autoTriggered
    ? `<span class="ts-auto-tag">⚡ Automatická kontrola</span>`
    : '';

  const reasonsHtml = reasons?.length
    ? `<p class="ts-reasons-title">Zistené faktory</p>
       <ul class="ts-reasons">${reasons.map(r => `<li>${escHtml(r)}</li>`).join('')}</ul>`
    : '<p class="ts-muted" style="margin-bottom:12px">Žiadne rizikové faktory.</p>';

  const ctaHtml = (riskLevel === 'medium' || riskLevel === 'high') ? `
    <div class="ts-divider"></div>
    <button class="ts-btn ts-btn-primary" id="ts-send-btn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
      </svg>
      Odoslať na overenie
    </button>
  ` : `
    <div class="ts-divider"></div>
    <button class="ts-btn ts-btn-secondary" id="ts-mark-known-btn">
      ✓ Označiť ako dôveryhodného
    </button>
  `;

  setBody(`
    ${autoTag}
    <div class="ts-risk-card ts-${riskLevel}">
      <div class="ts-risk-label">Úroveň rizika</div>
      <div class="ts-risk-value ts-${riskLevel}">${emoji} ${label}</div>
    </div>
    ${reasonsHtml}
    ${ctaHtml}
  `);

  document.getElementById('ts-send-btn')?.addEventListener('click', () => {
    showSentConfirmation();
  });

  document.getElementById('ts-mark-known-btn')?.addEventListener('click', async () => {
    await recordSender(senderEmail);
    hidePanel();
  });
}

function showSentConfirmation() {
  setBody(`
    <div class="ts-sent">
      <div class="ts-sent-icon">✓</div>
      <strong>Odoslané schvaľovateľovi</strong>
      <p>Schvaľovateľ dostane e-mail s možnosťou schváliť alebo zamietnuť.</p>
      <a href="http://localhost:3000/dashboard" target="_blank" class="ts-btn ts-btn-secondary" style="margin-top:4px">
        Zobraziť v dashboarde →
      </a>
    </div>
  `);
}

function showIdle() {
  setBody(`<div class="ts-idle">Otvorte e-mail<br>na automatickú analýzu.</div>`);
}

// ─── Core analysis logic ──────────────────────────────────────────────────────

async function analyzeEmail({ silent = false, autoTriggered = false } = {}) {
  const { subject, sender, senderEmail, body } = extractEmailData();
  if (!subject && !body) return;

  // Deduplicate: skip if same email is already being shown
  const emailKey = `${senderEmail}::${subject}`;
  if (emailKey === lastEmailKey) return;
  lastEmailKey = emailKey;

  // Cancel previous in-flight request
  if (analysisController) analysisController.abort();
  analysisController = new AbortController();

  if (autoTriggered) {
    showNewSenderWarning(senderEmail);
  } else if (!silent) {
    showLoading();
  }

  const text = `Od: ${sender}\nPredmet: ${subject}\n\n${body}`;

  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  analysisController.signal,
      body:    JSON.stringify({
        text,
        submittedBy:  senderEmail || 'Gmail Extension',
        companyId:    DEMO_COMPANY_ID,
      }),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    // Record sender as seen (increases their known count)
    await recordSender(senderEmail);

    showResult({
      riskLevel:     data.riskLevel,
      reasons:       data.reasons ?? [],
      requestId:     data.id,
      senderEmail,
      autoTriggered,
    });

    // For high risk, pulse the panel border to draw attention
    if (data.riskLevel === 'high') {
      const panel = document.getElementById('truststep-panel');
      panel?.classList.add('ts-alert');
      setTimeout(() => panel?.classList.remove('ts-alert'), 3000);
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[FeelsOdd]', err);
    if (!silent) {
      setBody(`
        <div class="ts-error">Nepodarilo sa spojiť s FeelsOdd API.<br>Skontrolujte či beží localhost:3000.</div>
        <button class="ts-btn ts-btn-secondary" id="ts-retry-btn" style="margin-top:8px">Skúsiť znova</button>
      `);
      document.getElementById('ts-retry-btn')?.addEventListener('click', () => analyzeEmail());
    }
  }
}

// ─── Auto-trigger for new/unknown senders ────────────────────────────────────

async function onEmailOpen() {
  lastEmailKey = null; // reset so new email always re-evaluates

  // Wait for Gmail to finish rendering the email body
  await wait(900);

  const { senderEmail, subject, body } = extractEmailData();
  if (!senderEmail && !body) return;

  const newSender = await isNewSender(senderEmail);

  if (newSender) {
    // Auto-analyze and show panel immediately
    await analyzeEmail({ autoTriggered: true });
  } else {
    // Known sender — just show a small idle panel, don't auto-analyze
    showIdle();
    // Don't call showPanel() — keep it hidden unless user manually triggers
  }
}

// ─── MutationObserver: detect Gmail navigation ────────────────────────────────

let currentUrl = location.href;

// Watch for URL changes (Gmail SPA navigation between emails)
const urlObserver = new MutationObserver(() => {
  if (location.href === currentUrl) return;
  currentUrl = location.href;
  if (/[#/](inbox|sent|all|search|label|spam)[/#]/.test(currentUrl)) {
    onEmailOpen();
  }
});

// Watch for email body appearing in DOM (handles cases where URL stays same)
let debounceTimer = null;
const domObserver = new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.querySelector?.('.a3s.aiL') || node.classList?.contains('ii')) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(onEmailOpen, 600);
        return;
      }
    }
  }
});

// ─── Manual trigger button (small floating button when panel is hidden) ───────

function createTriggerButton() {
  if (document.getElementById('ts-trigger-btn')) return;

  const btn = document.createElement('button');
  btn.id        = 'ts-trigger-btn';
  btn.title     = 'FeelsOdd — analyzovať e-mail';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#3B82F6"/>
    </svg>
  `;
  btn.addEventListener('click', () => {
    const panel = document.getElementById('truststep-panel');
    if (panel?.classList.contains('ts-hidden')) {
      showLoading();
      showPanel();
      analyzeEmail();
    } else {
      hidePanel();
    }
  });
  document.body.appendChild(btn);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function init() {
  createPanel();
  createTriggerButton();

  urlObserver.observe(document.body, { childList: true, subtree: true });
  domObserver.observe(document.body, { childList: true, subtree: true });

  // Handle direct load on an already-open email
  if (document.querySelector('.a3s.aiL')) {
    setTimeout(onEmailOpen, 1200);
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function escHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
