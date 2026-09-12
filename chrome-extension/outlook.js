const APP_URL = 'http://localhost:3000';
const API_URL = `${APP_URL}/api/analyze`;
const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const KNOWN_THRESHOLD = 2;

let lastEmailKey = null;
let analysisController = null;
let currentUrl = location.href;
let debounceTimer = null;

function getKnownSenders() {
  return new Promise((resolve) => {
    chrome.storage.local.get('knownSenders', (result) => resolve(result.knownSenders || {}));
  });
}

function recordSender(email) {
  if (!email) return Promise.resolve();

  return new Promise((resolve) => {
    chrome.storage.local.get('knownSenders', (result) => {
      const known = result.knownSenders || {};
      known[email] = (known[email] || 0) + 1;
      chrome.storage.local.set({ knownSenders: known }, resolve);
    });
  });
}

async function isNewSender(email) {
  if (!email) return false;
  const known = await getKnownSenders();
  return (known[email] || 0) < KNOWN_THRESHOLD;
}

function queryFirst(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function readText(selectors) {
  const element = queryFirst(selectors);
  return element?.innerText?.trim() ?? element?.textContent?.trim() ?? '';
}

function parseSenderValue(rawValue = '') {
  const emailMatch = rawValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const senderEmail = emailMatch?.[0]?.toLowerCase() ?? '';
  const senderName = rawValue
    .replace(/^from:\s*/i, '')
    .replace(senderEmail, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sender = senderName && senderEmail
    ? `${senderName} <${senderEmail}>`
    : senderEmail || senderName || rawValue.trim();

  return { sender, senderEmail };
}

function extractSenderData() {
  const senderLink = queryFirst([
    'a[href^="mailto:"]',
    'button[title*="@"]',
    'span[title*="@"]',
    '[aria-label^="From:"]',
  ]);

  if (!senderLink) {
    return { sender: '', senderEmail: '' };
  }

  const href = senderLink.getAttribute('href') || '';
  if (href.startsWith('mailto:')) {
    const senderEmail = href.replace(/^mailto:/i, '').trim().toLowerCase();
    const senderName = senderLink.textContent?.trim() || senderEmail;
    return {
      sender: senderName && senderName !== senderEmail ? `${senderName} <${senderEmail}>` : senderEmail,
      senderEmail,
    };
  }

  const rawValue = senderLink.getAttribute('aria-label')
    || senderLink.getAttribute('title')
    || senderLink.textContent
    || '';

  return parseSenderValue(rawValue);
}

function extractSubject() {
  const subject = readText([
    '[role="heading"][aria-level="2"]',
    '[role="heading"][aria-level="1"]',
    '[data-testid="message-subject"]',
    '[data-test-id="message-subject"]',
    'h1',
  ]);

  if (subject) return subject;

  return document.title.replace(/\s*-\s*Outlook.*$/i, '').trim();
}

function extractBody() {
  const body = readText([
    'div[role="document"]',
    '[aria-label="Message body"]',
    '[data-testid="mail-read-pane-message-body"]',
    '.allowTextSelection',
  ]);

  return body.slice(0, 3000);
}

function extractEmailData() {
  const subject = extractSubject();
  const { sender, senderEmail } = extractSenderData();
  const body = extractBody();

  return { subject, sender, senderEmail, body };
}

function createPanel() {
  if (document.getElementById('truststep-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'truststep-panel';
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
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="ts-body" id="ts-body"></div>
  `;

  document.body.appendChild(panel);
  document.getElementById('ts-close-btn')?.addEventListener('click', () => panel.classList.add('ts-hidden'));
}

function showPanel() {
  document.getElementById('truststep-panel')?.classList.remove('ts-hidden');
}

function hidePanel() {
  document.getElementById('truststep-panel')?.classList.add('ts-hidden');
}

function setBody(html) {
  const element = document.getElementById('ts-body');
  if (element) element.innerHTML = html;
}

function showIdle() {
  setBody('<div class="ts-idle">Otvorte e-mail v Outlooku<br>na automatickú analýzu.</div>');
}

function showLoading(label = 'Analyzujem e-mail...') {
  setBody(`
    <div class="ts-loading">
      <div class="ts-spinner"></div>
      ${escHtml(label)}
    </div>
  `);
  showPanel();
}

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

function showResult({ riskLevel, reasons, requestId, senderEmail, autoTriggered }) {
  const emoji = { low: '🟢', medium: '🟡', high: '🔴' }[riskLevel] ?? '⚪';
  const label = { low: 'Nízke riziko', medium: 'Stredné riziko', high: 'Vysoké riziko' }[riskLevel] ?? riskLevel;
  const autoTag = autoTriggered ? '<span class="ts-auto-tag">⚡ Automatická kontrola</span>' : '';
  const reasonsHtml = reasons?.length
    ? `<p class="ts-reasons-title">Zistené faktory</p><ul class="ts-reasons">${reasons.map((reason) => `<li>${escHtml(reason)}</li>`).join('')}</ul>`
    : '<p class="ts-muted" style="margin-bottom:12px">Žiadne rizikové faktory.</p>';

  const reportHref = requestId ? `${APP_URL}/report/${requestId}` : `${APP_URL}/submit`;
  const secondaryCtaHtml = riskLevel === 'low'
    ? '<button class="ts-btn ts-btn-secondary" id="ts-mark-known-btn">✓ Označiť ako dôveryhodného</button>'
    : `<a href="${APP_URL}/dashboard" target="_blank" rel="noopener noreferrer" class="ts-btn ts-btn-secondary">Zobraziť v dashboarde →</a>`;

  setBody(`
    ${autoTag}
    <div class="ts-risk-card ts-${riskLevel}">
      <div class="ts-risk-label">Úroveň rizika</div>
      <div class="ts-risk-value ts-${riskLevel}">${emoji} ${label}</div>
    </div>
    ${reasonsHtml}
    <div class="ts-divider"></div>
    <a href="${reportHref}" target="_blank" rel="noopener noreferrer" class="ts-btn ts-btn-primary">
      ${requestId ? 'Otvoriť celý report' : 'Otvoriť v FeelsOdd'}
    </a>
    ${secondaryCtaHtml}
  `);

  document.getElementById('ts-mark-known-btn')?.addEventListener('click', async () => {
    await recordSender(senderEmail);
    hidePanel();
  });
}

function showError() {
  setBody(`
    <div class="ts-error">Nepodarilo sa spojiť s FeelsOdd API.<br>Skontrolujte či beží localhost:3000.</div>
    <button class="ts-btn ts-btn-secondary" id="ts-retry-btn" style="margin-top:8px">Skúsiť znova</button>
  `);
  document.getElementById('ts-retry-btn')?.addEventListener('click', () => analyzeEmail({ force: true }));
  showPanel();
}

async function analyzeEmail({ autoTriggered = false, force = false } = {}) {
  const { subject, sender, senderEmail, body } = extractEmailData();
  if (!subject && !body) return;

  const emailKey = `${senderEmail}::${subject}`;
  if (!force && emailKey === lastEmailKey) return;
  lastEmailKey = emailKey;

  if (analysisController) analysisController.abort();
  analysisController = new AbortController();

  if (autoTriggered && senderEmail) {
    showNewSenderWarning(senderEmail);
  } else {
    showLoading();
  }

  const text = `Od: ${sender || senderEmail || 'Neznámy odosielateľ'}\nPredmet: ${subject}\n\n${body}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: analysisController.signal,
      body: JSON.stringify({
        text,
        submittedBy: senderEmail || 'Outlook Extension',
        companyId: DEMO_COMPANY_ID,
      }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);

    const data = await response.json();
    if (senderEmail) {
      await recordSender(senderEmail);
    }

    showResult({
      riskLevel: data.riskLevel,
      reasons: data.reasons ?? [],
      requestId: data.id,
      senderEmail,
      autoTriggered,
    });

    if (data.riskLevel === 'high') {
      const panel = document.getElementById('truststep-panel');
      panel?.classList.add('ts-alert');
      setTimeout(() => panel?.classList.remove('ts-alert'), 3000);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    console.error('[FeelsOdd Outlook]', error);
    showError();
  }
}

async function onEmailOpen() {
  lastEmailKey = null;
  await wait(700);

  const { senderEmail, subject, body } = extractEmailData();
  if (!senderEmail && !subject && !body) return;

  if (senderEmail && await isNewSender(senderEmail)) {
    await analyzeEmail({ autoTriggered: true });
    return;
  }

  showIdle();
}

function createTriggerButton() {
  if (document.getElementById('ts-trigger-btn')) return;

  const button = document.createElement('button');
  button.id = 'ts-trigger-btn';
  button.title = 'FeelsOdd — analyzovať e-mail v Outlooku';
  button.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#3B82F6"/>
    </svg>
  `;
  button.addEventListener('click', () => {
    const panel = document.getElementById('truststep-panel');
    if (panel?.classList.contains('ts-hidden')) {
      showPanel();
      analyzeEmail({ force: true });
    } else {
      hidePanel();
    }
  });

  document.body.appendChild(button);
}

function handleRuntimeMessage(message, sendResponse) {
  if (message?.type !== 'truststep:analyze-email') return false;
  showPanel();
  analyzeEmail({ force: true });
  sendResponse({ handled: true });
  return true;
}

function observeChanges() {
  const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onEmailOpen, 600);
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const { subject, body } = extractEmailData();
      if (subject || body) {
        onEmailOpen();
      }
    }, 700);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function escHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function init() {
  createPanel();
  createTriggerButton();
  observeChanges();

  if (extractSubject() || extractBody()) {
    setTimeout(onEmailOpen, 1200);
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => handleRuntimeMessage(message, sendResponse));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
