// FeelsOdd page-check content script
// Runs on all non-Gmail pages. Shows a floating button to analyze the current page.

const APP_URL = 'http://localhost:3000'
const API_URL = `${APP_URL}/api/analyze-url`;

// Sites that are obviously safe — skip the button entirely
const SAFE_DOMAINS = [
  'google.com', 'google.sk', 'youtube.com', 'facebook.com',
  'instagram.com', 'linkedin.com', 'github.com', 'wikipedia.org',
  'microsoft.com', 'apple.com', 'amazon.com', 'netflix.com',
];

const hostname = location.hostname.replace(/^www\./, '')
const isSafe   = SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))

// ─── Suspicion heuristics (before any AI call) ────────────────────────────────

function quickSuspicionCheck() {
  const signals = []

  // Login form on a domain that looks like a bank/fintech impersonator
  const hasPwdField = !!document.querySelector('input[type="password"]')
  const bankWords   = /banka|sporitelna|vub|csob|tatra|paypal|bank|login|prihlasenie|heslo/i.test(document.title + hostname)
  if (hasPwdField && bankWords) signals.push('Prihlasovací formulár na podozrivej stránke')

  // Punycode / IDN homograph (e.g. xn-- prefix in URL)
  if (hostname.includes('xn--')) signals.push('Doména používa špeciálne znaky (možný homograph útok)')

  // Suspicious TLD
  if (/\.(xyz|top|click|tk|ml|ga|cf|gq|pw|cc|su)$/.test(hostname)) signals.push('Podozrivá doménová prípona')

  // Very long subdomain chain (e.g. login.bank.com.evil.net)
  if ((hostname.match(/\./g) || []).length >= 3) signals.push('Neobvykle dlhý reťazec subdomén')

  // Domain contains brand name but isn't the brand
  const brands = ['paypal', 'google', 'apple', 'microsoft', 'amazon', 'netflix', 'banka', 'sporitelna']
  brands.forEach(b => {
    if (hostname.includes(b) && !hostname.endsWith(b + '.com') && !hostname.endsWith(b + '.sk')) {
      signals.push(`Doména obsahuje značku "${b}" ale nie je oficiálna stránka`)
    }
  })

  return signals
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function createPanel() {
  if (document.getElementById('truststep-panel')) return

  const panel = document.createElement('div')
  panel.id    = 'truststep-panel'
  panel.classList.add('ts-hidden')
  panel.innerHTML = `
    <div class="ts-header">
      <div class="ts-logo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#3B82F6"/>
        </svg>
        FeelsOdd
      </div>
      <button class="ts-close" id="ts-close-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="ts-body" id="ts-body"></div>
  `
  document.body.appendChild(panel)
  document.getElementById('ts-close-btn').addEventListener('click', () => {
    panel.classList.add('ts-hidden')
  })
}

function ensurePanel() {
  createPanel()
}

function setBody(html)   { const el = document.getElementById('ts-body'); if (el) el.innerHTML = html }
function showPanel()     { document.getElementById('truststep-panel')?.classList.remove('ts-hidden') }

function formatTargetValue(value = '') {
  if (!value) return ''
  const trimmed = value.trim()
  if (trimmed.length <= 140) return trimmed
  return `${trimmed.slice(0, 137)}...`
}

function renderContextMeta(targetLabel, targetValue) {
  if (!targetLabel && !targetValue) return ''

  return `
    <div class="ts-context-block">
      ${targetLabel ? `<div class="ts-context-label">${escHtml(targetLabel)}</div>` : ''}
      ${targetValue ? `<div class="ts-context-value">${escHtml(formatTargetValue(targetValue))}</div>` : ''}
    </div>
  `
}

function showLoading(msg = 'Kontrolujem stránku...', options = {}) {
  const { targetLabel = '', targetValue = '' } = options
  ensurePanel()
  setBody(`
    ${renderContextMeta(targetLabel, targetValue)}
    <div class="ts-loading"><div class="ts-spinner"></div>${escHtml(msg)}</div>
  `)
  showPanel()
}

function showQuickWarning(signals) {
  ensurePanel()
  setBody(`
    <div class="ts-new-sender">
      <div class="ts-new-sender-icon">⚠️</div>
      <strong>Podozrivá stránka</strong>
      <p class="ts-muted" style="margin-top:4px">${escHtml(hostname)}</p>
    </div>
    <ul class="ts-reasons" style="margin-bottom:14px">
      ${signals.map(s => `<li>${escHtml(s)}</li>`).join('')}
    </ul>
    <button class="ts-btn ts-btn-primary" id="ts-deep-btn">
      Spustiť AI analýzu
    </button>
    <button class="ts-btn ts-btn-secondary" id="ts-ignore-btn" style="margin-top:8px">
      Ignorovať
    </button>
  `)
  showPanel()

  // Pulse red border on auto-trigger
  document.getElementById('truststep-panel')?.classList.add('ts-alert')
  setTimeout(() => document.getElementById('truststep-panel')?.classList.remove('ts-alert'), 3000)

  document.getElementById('ts-deep-btn')?.addEventListener('click', () => analyzeCurrentPage(true))
  document.getElementById('ts-ignore-btn')?.addEventListener('click', () => {
    document.getElementById('truststep-panel')?.classList.add('ts-hidden')
  })
}

function showResult({ riskLevel, reasons, recommendation, ctaHref, ctaLabel, targetLabel, targetValue }) {
  const emoji = { low: '🟢', medium: '🟡', high: '🔴' }[riskLevel] ?? '⚪'
  const label = { low: 'Nízke riziko', medium: 'Stredné riziko', high: 'Vysoké riziko' }[riskLevel] ?? riskLevel

  const reasonsHtml = reasons?.length
    ? `<p class="ts-reasons-title">Zistené faktory</p>
       <ul class="ts-reasons">${reasons.map(r => `<li>${escHtml(r)}</li>`).join('')}</ul>`
    : ''

  ensurePanel()
  setBody(`
    ${renderContextMeta(targetLabel, targetValue)}
    <div class="ts-risk-card ts-${riskLevel}">
      <div class="ts-risk-label">Úroveň rizika</div>
      <div class="ts-risk-value ts-${riskLevel}">${emoji} ${label}</div>
    </div>
    ${reasonsHtml}
    <div class="ts-divider"></div>
    <p class="ts-muted" style="font-size:11px;margin-bottom:10px">${escHtml(recommendation)}</p>
    <a href="${escAttr(ctaHref)}" target="_blank" rel="noopener noreferrer"
       class="ts-btn ts-btn-secondary">
      ${escHtml(ctaLabel)}
    </a>
  `)

  if (riskLevel === 'high') {
    document.getElementById('truststep-panel')?.classList.add('ts-alert')
    setTimeout(() => document.getElementById('truststep-panel')?.classList.remove('ts-alert'), 3000)
  }
}

function showError({ message = 'Nepodarilo sa spojiť s FeelsOdd API.<br>Skontrolujte či beží localhost:3000.', targetLabel = '', fallbackUrl = '', retryAction = true }) {
  ensurePanel()
  setBody(`
    ${renderContextMeta(targetLabel, '')}
    <div class="ts-error">${message}</div>
    ${retryAction ? '<button class="ts-btn ts-btn-secondary" id="ts-retry-btn" style="margin-top:8px">Skúsiť znova</button>' : ''}
    ${fallbackUrl ? `<a href="${escAttr(fallbackUrl)}" target="_blank" rel="noopener noreferrer" class="ts-btn ts-btn-secondary">Otvoriť v FeelsOdd →</a>` : ''}
  `)
  document.getElementById('ts-retry-btn')?.addEventListener('click', () => analyzeCurrentPage(true))
  showPanel()
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

async function analyzeCurrentPage(showLoadingState = false) {
  if (showLoadingState) showLoading('AI analyzuje stránku...', {
    targetLabel: 'Aktuálna stránka',
    targetValue: location.href,
  })

  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url:         location.href,
        submittedBy: 'Chrome Extension',
        companyId:   '00000000-0000-0000-0000-000000000001',
      }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    showResult({
      ...data,
      targetLabel: 'Aktuálna stránka',
      targetValue: location.href,
      ctaHref: data.id ? `${APP_URL}/report/${data.id}` : `${APP_URL}/submit?tab=url&shared_url=${encodeURIComponent(location.href)}&submitted_by=${encodeURIComponent('Browser Extension')}`,
      ctaLabel: data.id ? 'Otvoriť celý report →' : 'Otvoriť v FeelsOdd →',
    })
  } catch (err) {
    console.error('[FeelsOdd page-check]', err)
    showError({})
  }
}

function handleRuntimeMessage(message, sendResponse) {
  if (!message?.type?.startsWith('truststep:')) return false

  if (message.type === 'truststep:show-loading') {
    const payload = message.payload || {}
    showLoading(payload.label || 'Analyzujem...', payload)
    sendResponse({ handled: true })
    return true
  }

  if (message.type === 'truststep:show-analysis-result') {
    const payload = message.payload || {}
    const result = payload.result || {}
    showResult({
      riskLevel: result.riskLevel,
      reasons: result.reasons ?? [],
      recommendation: result.recommendation ?? 'Skontrolujte výsledok v FeelsOdd.',
      targetLabel: payload.targetLabel,
      targetValue: payload.targetValue,
      ctaHref: payload.ctaHref || `${APP_URL}/submit`,
      ctaLabel: payload.ctaLabel || 'Otvoriť v FeelsOdd →',
    })
    sendResponse({ handled: true })
    return true
  }

  if (message.type === 'truststep:show-analysis-error') {
    const payload = message.payload || {}
    showError({
      message: escHtml(payload.message || 'Nepodarilo sa spojiť s FeelsOdd API.'),
      targetLabel: payload.targetLabel,
      fallbackUrl: payload.fallbackUrl || '',
      retryAction: false,
    })
    sendResponse({ handled: true })
    return true
  }

  return false
}

// ─── Trigger button ───────────────────────────────────────────────────────────

function createTriggerButton() {
  if (document.getElementById('ts-trigger-btn') || isSafe) return

  const btn = document.createElement('button')
  btn.id        = 'ts-trigger-btn'
  btn.title     = 'FeelsOdd — skontrolovať stránku'
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#3B82F6"/>
    </svg>
  `
  btn.addEventListener('click', () => {
    const panel = document.getElementById('truststep-panel')
    if (panel?.classList.contains('ts-hidden')) {
      showLoading()
      analyzeCurrentPage()
    } else {
      panel?.classList.add('ts-hidden')
    }
  })
  document.body.appendChild(btn)
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function init() {
  if (!isSafe) {
    createPanel()
    createTriggerButton()

    // Run quick local heuristics first (no API call needed)
    const suspicionSignals = quickSuspicionCheck()
    if (suspicionSignals.length >= 2) {
      // Looks suspicious locally — show warning immediately, offer deep AI scan
      setTimeout(() => showQuickWarning(suspicionSignals), 800)
    }
  }
}

function escHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escAttr(str = '') {
  return escHtml(str).replace(/"/g, '&quot;')
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => handleRuntimeMessage(message, sendResponse))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
