const FEELSODD_APP_URL = 'http://localhost:3000'
const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

const MENU_IDS = {
  selection: 'truststep-analyze-selection',
  link: 'truststep-analyze-link',
  page: 'truststep-analyze-page',
  email: 'truststep-analyze-email',
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_IDS.selection,
      title: 'Analyzovať označený text v FeelsOdd',
      contexts: ['selection'],
    })

    chrome.contextMenus.create({
      id: MENU_IDS.link,
      title: 'Skontrolovať tento link v FeelsOdd',
      contexts: ['link'],
    })

    chrome.contextMenus.create({
      id: MENU_IDS.page,
      title: 'Analyzovať túto stránku v FeelsOdd',
      contexts: ['page'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    })

    chrome.contextMenus.create({
      id: MENU_IDS.email,
      title: 'Analyzovať otvorený e-mail',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://mail.google.com/*',
        'https://outlook.live.com/*',
        'https://outlook.office.com/*',
        'https://outlook.office365.com/*',
      ],
    })
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return

  if (info.menuItemId === MENU_IDS.email) {
    await triggerEmailAnalysis(tab.id)
    return
  }

  if (info.menuItemId === MENU_IDS.selection && info.selectionText?.trim()) {
    await analyzeSelectedText(tab, info.selectionText.trim())
    return
  }

  if (info.menuItemId === MENU_IDS.link && info.linkUrl) {
    await analyzeUrlTarget(tab, info.linkUrl, {
      loadingLabel: 'Kontrolujem odkaz...',
      targetLabel: 'Označený link',
      targetValue: info.linkText || info.linkUrl,
      submittedBy: 'Browser Extension — Link',
    })
    return
  }

  if (info.menuItemId === MENU_IDS.page && tab.url) {
    if (isEmailUrl(tab.url)) {
      await triggerEmailAnalysis(tab.id)
      return
    }

    await analyzeUrlTarget(tab, tab.url, {
      loadingLabel: 'Kontrolujem stránku...',
      targetLabel: 'Aktuálna stránka',
      targetValue: tab.title || tab.url,
      submittedBy: 'Browser Extension — Page',
    })
  }
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return

  if (tab.url && isEmailUrl(tab.url)) {
    await triggerEmailAnalysis(tab.id)
    return
  }

  if (tab.url && /^https?:/i.test(tab.url)) {
    await analyzeUrlTarget(tab, tab.url, {
      loadingLabel: 'Kontrolujem stránku...',
      targetLabel: 'Aktuálna stránka',
      targetValue: tab.title || tab.url,
      submittedBy: 'Browser Extension — Page',
    })
    return
  }

  await chrome.tabs.create({ url: `${FEELSODD_APP_URL}/submit` })
})

async function triggerEmailAnalysis(tabId) {
  const handled = await sendTabMessage(tabId, { type: 'truststep:analyze-email' })
  if (!handled) {
    await chrome.tabs.create({ url: `${FEELSODD_APP_URL}/submit` })
  }
}

async function analyzeSelectedText(tab, selectedText) {
  const trimmed = selectedText.slice(0, 4000)
  await sendTabMessage(tab.id, {
    type: 'truststep:show-loading',
    payload: {
      label: 'Analyzujem označený text...',
      targetLabel: 'Označený text',
      targetValue: trimmed,
    },
  })

  try {
    const result = await postJson('/api/analyze', {
      text: trimmed,
      submittedBy: 'Browser Extension',
      companyId: DEMO_COMPANY_ID,
    })

    const fallbackUrl = result.id
      ? `${FEELSODD_APP_URL}/report/${result.id}`
      : buildSubmitUrl({
          tab: 'email',
          shared_text: trimmed,
          submitted_by: 'Browser Extension',
        })

    const handled = await sendTabMessage(tab.id, {
      type: 'truststep:show-analysis-result',
      payload: {
        sourceType: 'text',
        targetLabel: 'Označený text',
        targetValue: trimmed,
        result,
        ctaLabel: result.id ? 'Otvoriť celý report →' : 'Otvoriť v FeelsOdd →',
        ctaHref: fallbackUrl,
      },
    })

    if (!handled) {
      await chrome.tabs.create({ url: fallbackUrl })
    }
  } catch (error) {
    await sendOrOpenError(tab.id, {
      targetLabel: 'Označený text',
      message: getErrorMessage(error),
      fallbackUrl: buildSubmitUrl({
        tab: 'email',
        shared_text: trimmed,
        submitted_by: 'Browser Extension',
      }),
    })
  }
}

async function analyzeUrlTarget(tab, url, context) {
  await sendTabMessage(tab.id, {
    type: 'truststep:show-loading',
    payload: {
      label: context.loadingLabel,
      targetLabel: context.targetLabel,
      targetValue: context.targetValue,
    },
  })

  try {
    const result = await postJson('/api/analyze-url', {
      url,
      submittedBy: context.submittedBy,
      companyId: DEMO_COMPANY_ID,
    })

    const fallbackUrl = result.id
      ? `${FEELSODD_APP_URL}/report/${result.id}`
      : buildSubmitUrl({
          tab: 'url',
          shared_url: url,
          submitted_by: context.submittedBy,
        })

    const handled = await sendTabMessage(tab.id, {
      type: 'truststep:show-analysis-result',
      payload: {
        sourceType: 'url',
        targetLabel: context.targetLabel,
        targetValue: context.targetValue,
        result,
        ctaLabel: result.id ? 'Otvoriť celý report →' : 'Otvoriť v FeelsOdd →',
        ctaHref: fallbackUrl,
      },
    })

    if (!handled) {
      await chrome.tabs.create({ url: fallbackUrl })
    }
  } catch (error) {
    await sendOrOpenError(tab.id, {
      targetLabel: context.targetLabel,
      message: getErrorMessage(error),
      fallbackUrl: buildSubmitUrl({
        tab: 'url',
        shared_url: url,
        submitted_by: context.submittedBy,
      }),
    })
  }
}

async function sendOrOpenError(tabId, payload) {
  const handled = await sendTabMessage(tabId, {
    type: 'truststep:show-analysis-error',
    payload,
  })

  if (!handled && payload.fallbackUrl) {
    await chrome.tabs.create({ url: payload.fallbackUrl })
  }
}

async function postJson(path, body) {
  const response = await fetch(`${FEELSODD_APP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `FeelsOdd API returned ${response.status}`)
  }

  return payload
}

function buildSubmitUrl(params) {
  const url = new URL('/submit', FEELSODD_APP_URL)
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

function isEmailUrl(url) {
  return /^https:\/\/mail\.google\.com\//i.test(url)
    || /^https:\/\/outlook\.live\.com\//i.test(url)
    || /^https:\/\/outlook\.office(?:365)?\.com\//i.test(url)
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Nepodarilo sa spojiť s FeelsOdd API.'
}

function sendTabMessage(tabId, message) {
  if (!tabId) return Promise.resolve(false)

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false)
        return
      }

      resolve(Boolean(response?.handled))
    })
  })
}
