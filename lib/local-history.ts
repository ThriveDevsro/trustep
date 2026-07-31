import type { Request, RequestSource, RequestStatus, RiskLevel } from '@/lib/types'

const LOCAL_REQUESTS_KEY = 'truststep_local_requests'

type CreateLocalRequestInput = {
  companyId: string
  submittedBy: string
  text: string
  riskLevel: RiskLevel
  reasons: string[]
  recommendation: string
  source: RequestSource
  status?: RequestStatus
  phoneFrom?: string
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readLocalRequests(): Request[] {
  if (!canUseBrowserStorage()) return []

  try {
    const raw = window.localStorage.getItem(LOCAL_REQUESTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as Request[] : []
  } catch {
    return []
  }
}

function writeLocalRequests(requests: Request[]) {
  if (!canUseBrowserStorage()) return
  window.localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests))
}

export function getLocalRequests(companyId?: string): Request[] {
  const requests = readLocalRequests()
  if (!companyId) return requests
  return requests.filter((request) => request.company_id === companyId)
}

export function getLocalRequestById(id: string): Request | null {
  const requests = readLocalRequests()
  return requests.find((request) => request.id === id) ?? null
}

export function saveLocalRequest(input: CreateLocalRequestInput): Request {
  const request: Request = {
    id: `local-${crypto.randomUUID()}`,
    company_id: input.companyId,
    submitted_by: input.submittedBy,
    text: input.text,
    risk_level: input.riskLevel,
    reasons: input.reasons,
    recommendation: input.recommendation,
    status: input.status ?? 'pending',
    source: input.source,
    phone_from: input.phoneFrom,
    approver_token: '',
    created_at: new Date().toISOString(),
  }

  const existing = readLocalRequests()
  writeLocalRequests([request, ...existing])
  return request
}
