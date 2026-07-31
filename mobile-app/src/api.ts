import type { AnalysisResult, AppUser, ConnectedInbox, SecurityRequest } from './types'

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

function buildHeaders(token?: string, extra?: Record<string, string>) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.')
  }

  return payload as T
}

export async function registerWithEmail(baseUrl: string, email: string, password: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  return parseResponse<{ user: AppUser; sessionToken: string }>(response)
}

export async function loginWithEmail(baseUrl: string, email: string, password: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  return parseResponse<{ user: AppUser; sessionToken: string }>(response)
}

export async function fetchCurrentUser(baseUrl: string, token: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/auth/me`, {
    headers: buildHeaders(token),
  })

  return parseResponse<{ user: AppUser | null }>(response)
}

export async function logout(baseUrl: string, token: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/auth/logout`, {
    method: 'POST',
    headers: buildHeaders(token),
  })

  return parseResponse<{ success: true }>(response)
}

export async function fetchRequests(baseUrl: string, token: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/dev-requests`, {
    headers: buildHeaders(token),
  })

  return parseResponse<{ requests: SecurityRequest[] }>(response)
}

export async function fetchInboxes(baseUrl: string, token: string, companyId: string) {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/inboxes?companyId=${encodeURIComponent(companyId)}`,
    { headers: buildHeaders(token) }
  )

  return parseResponse<{ inboxes: ConnectedInbox[] }>(response)
}

export async function createInbox(
  baseUrl: string,
  token: string,
  body: {
    companyId: string
    provider: 'gmail' | 'outlook' | 'imap'
    emailAddress: string
    displayName?: string
    scanMode?: 'auto' | 'manual' | 'digest'
  }
) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/inboxes`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })

  return parseResponse<{ inbox: ConnectedInbox; warning?: string }>(response)
}

export async function syncInboxes(baseUrl: string, token: string, companyId: string, inboxId?: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/inboxes/sync`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ companyId, inboxId }),
  })

  return parseResponse<{
    summary: { syncedInboxes: number; fetched: number; created: number; skipped: number; risky: number }
    warning?: string
  }>(response)
}

export async function analyzeText(baseUrl: string, token: string, input: { text: string; submittedBy: string; companyId: string }) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/analyze`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })

  return parseResponse<AnalysisResult>(response)
}

export async function analyzeUrl(baseUrl: string, token: string, input: { url: string; submittedBy: string; companyId: string }) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/analyze-url`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })

  return parseResponse<AnalysisResult>(response)
}

export async function analyzeImage(
  baseUrl: string,
  token: string,
  input: { uri: string; fileName: string; mimeType: string; submittedBy: string; companyId: string }
) {
  const formData = new FormData()
  formData.append('submittedBy', input.submittedBy)
  formData.append('companyId', input.companyId)
  formData.append('image', {
    uri: input.uri,
    name: input.fileName,
    type: input.mimeType,
  } as never)

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/analyze-image`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: formData,
  })

  return parseResponse<AnalysisResult>(response)
}
