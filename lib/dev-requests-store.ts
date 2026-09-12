import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Request, RequestSource, RequestStatus, RiskLevel } from '@/lib/types'

const DEV_REQUESTS_FILE = join(process.cwd(), '.truststep', 'dev-requests.json')

type CreateDevRequestInput = {
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

async function readRequests(): Promise<Request[]> {
  try {
    const raw = await readFile(DEV_REQUESTS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as Request[] : []
  } catch {
    return []
  }
}

async function writeRequests(requests: Request[]) {
  await mkdir(dirname(DEV_REQUESTS_FILE), { recursive: true })
  await writeFile(DEV_REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf8')
}

export async function createDevRequest(input: CreateDevRequestInput): Promise<Request> {
  const request: Request = {
    id: `devreq-${randomUUID()}`,
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

  const existing = await readRequests()
  await writeRequests([request, ...existing])
  return request
}

export async function listDevRequestsByCompany(companyId: string): Promise<Request[]> {
  const existing = await readRequests()
  return existing
    .filter((request) => request.company_id === companyId)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
}

export async function getDevRequestById(id: string): Promise<Request | null> {
  const existing = await readRequests()
  return existing.find((request) => request.id === id) ?? null
}

export async function updateDevRequestVerification(
  companyId: string,
  id: string,
  verification: Pick<Request, 'trusted_identity_id' | 'identity_status' | 'identity_comparison'>,
) {
  const requests = await readRequests()
  const index = requests.findIndex((request) => request.id === id && request.company_id === companyId)
  if (index < 0) return null
  requests[index] = { ...requests[index], ...verification }
  await writeRequests(requests)
  return requests[index]
}

export async function countDevRequestsThisMonth(companyId: string): Promise<number> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const requests = await listDevRequestsByCompany(companyId)
  return requests.filter((request) => new Date(request.created_at) >= monthStart).length
}
