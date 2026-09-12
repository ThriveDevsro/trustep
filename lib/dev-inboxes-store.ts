import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createDevRequest, listDevRequestsByCompany } from '@/lib/dev-requests-store'
import { analyzeForFraudResilient } from '@/lib/ai'
import type { ConnectedInbox, InboxConnectionMethod, InboxProvider, InboxStatus } from '@/lib/types'

const DEV_INBOXES_FILE = join(process.cwd(), '.truststep', 'dev-inboxes.json')

type DemoInboxRecord = ConnectedInbox & {
  imap_username?: string | null
  imap_password?: string | null
  demo_seed_index?: number
}

type DemoSyncSummary = {
  syncedInboxes: number
  fetched: number
  created: number
  skipped: number
  risky: number
}

type InboxHealthStats = {
  scanned24h: number
  risky7d: number
  total30d: number
  lastRequestAt: string | null
}

type DemoAlertFeed = Array<{
  id: string
  company_id: string
  request_id: string
  channel: 'slack'
  destination: 'demo-inbox'
  source: 'email'
  risk_level: 'low' | 'medium' | 'high'
  status: 'sent'
  submitted_by: string
  error_message: null
  created_at: string
}>

const DEMO_SEED_LIBRARY = [
  {
    subject: 'Urgent: zmena účtu dodávateľa',
    from: 'billing-update@vendor-finance-mail.com',
    body: 'Dobrý deň, z technických dôvodov sme zmenili bankový účet. Prosíme uhradiť najbližšiu faktúru na nový IBAN dnes do 14:00. Odpovedzte len na tento e-mail a nepotvrdzujte to cez pôvodné číslo.',
  },
  {
    subject: 'Meta Ads refund confirmation',
    from: 'refunds@meta-campaign-review.net',
    body: 'Your ad account is eligible for a refund. Verify the payout method and sign in through the attached link within 30 minutes to avoid cancellation.',
  },
  {
    subject: 'Schválenie platby od CEO',
    from: 'executive.office@company-secure-mail.co',
    body: 'Som na rokovaní a potrebujem, aby si diskrétne pripravil prevod na nového partnera. Je to citlivé, preto zatiaľ nekontaktuj nikoho z tímu. Potvrď, keď budeš pripravený na údaje.',
  },
  {
    subject: 'Marketplace buyer asks for courier fee',
    from: 'marketplace-buyer@buyer-mail.app',
    body: 'Kupujúci zaplatil za tovar, ale treba potvrdiť kuriéra cez odkaz a doplniť kartu kvôli prijatiu peňazí. Ak to nespravíte do hodiny, objednávka bude zrušená.',
  },
  {
    subject: 'Voice message transcript from bank support',
    from: 'security-team@bank-alert-support.org',
    body: 'Na vašom účte sme zaznamenali podozrivý pohyb. Zavolajte späť na číslo v tele správy alebo pošlite autorizačný kód, aby sme mohli účet zabezpečiť.',
  },
]

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function readInboxes(): Promise<DemoInboxRecord[]> {
  try {
    const raw = await readFile(DEV_INBOXES_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DemoInboxRecord[]) : []
  } catch {
    return []
  }
}

async function writeInboxes(inboxes: DemoInboxRecord[]) {
  await mkdir(dirname(DEV_INBOXES_FILE), { recursive: true })
  await writeFile(DEV_INBOXES_FILE, JSON.stringify(inboxes, null, 2), 'utf8')
}

export async function listDemoInboxes(companyId: string): Promise<DemoInboxRecord[]> {
  const inboxes = await readInboxes()
  return inboxes
    .filter((inbox) => inbox.company_id === companyId)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
}

export async function getDemoInboxById(id: string): Promise<DemoInboxRecord | null> {
  const inboxes = await readInboxes()
  return inboxes.find((inbox) => inbox.id === id) ?? null
}

export async function createDemoInbox(input: {
  companyId: string
  provider: InboxProvider
  emailAddress: string
  displayName?: string
  scanMode: 'auto' | 'manual' | 'digest'
  imapHost?: string
  imapPort?: number
  imapSecure?: boolean
  imapUsername?: string
  imapPassword?: string
}) {
  const connectionMethod: Record<InboxProvider, InboxConnectionMethod> = {
    gmail: 'oauth',
    outlook: 'oauth',
    imap: 'imap',
  }

  const status: InboxStatus = input.provider === 'imap' ? 'connected' : 'pending'
  const inbox: DemoInboxRecord = {
    id: `devinbox-${randomUUID()}`,
    company_id: input.companyId,
    provider: input.provider,
    email_address: normalizeEmail(input.emailAddress),
    display_name: input.displayName?.trim() || null,
    connection_method: connectionMethod[input.provider],
    status,
    scan_mode: input.scanMode,
    imap_host: input.provider === 'imap' ? input.imapHost || null : null,
    imap_port: input.provider === 'imap' ? input.imapPort || 993 : null,
    imap_secure: input.provider === 'imap' ? input.imapSecure !== false : null,
    last_checked_at: null,
    last_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    imap_username: input.provider === 'imap' ? input.imapUsername || null : null,
    imap_password: input.provider === 'imap' ? input.imapPassword || null : null,
    demo_seed_index: 0,
  }

  const inboxes = await readInboxes()
  inboxes.push(inbox)
  await writeInboxes(inboxes)
  return inbox
}

export async function updateDemoInbox(id: string, updates: Partial<DemoInboxRecord>) {
  const inboxes = await readInboxes()
  const index = inboxes.findIndex((inbox) => inbox.id === id)
  if (index === -1) return null

  inboxes[index] = {
    ...inboxes[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  await writeInboxes(inboxes)
  return inboxes[index]
}

export async function deleteDemoInbox(id: string) {
  const inboxes = await readInboxes()
  const next = inboxes.filter((inbox) => inbox.id !== id)
  await writeInboxes(next)
}

function buildDemoEmailText(inbox: DemoInboxRecord, seed: (typeof DEMO_SEED_LIBRARY)[number]) {
  return [
    'Analyzovaný inbound e-mail:',
    `Inbox: ${inbox.email_address}`,
    `Predmet: ${seed.subject}`,
    `Od: ${seed.from}`,
    '',
    seed.body,
  ].join('\n')
}

export async function syncDemoInboxes(options: { companyId: string; inboxId?: string }) {
  const inboxes = await listDemoInboxes(options.companyId)
  const targetInboxes = options.inboxId ? inboxes.filter((inbox) => inbox.id === options.inboxId) : inboxes

  const summary: DemoSyncSummary = {
    syncedInboxes: 0,
    fetched: 0,
    created: 0,
    skipped: 0,
    risky: 0,
  }

  for (const inbox of targetInboxes) {
    if (inbox.status === 'paused') {
      summary.skipped += 1
      continue
    }

    const nextSeed = DEMO_SEED_LIBRARY[inbox.demo_seed_index ?? 0]
    if (!nextSeed) {
      await updateDemoInbox(inbox.id, {
        last_checked_at: new Date().toISOString(),
        last_error: null,
      })
      summary.skipped += 1
      continue
    }

    summary.syncedInboxes += 1
    summary.fetched += 1

    const text = buildDemoEmailText(inbox, nextSeed)
    const analysis = await analyzeForFraudResilient(text)
    await createDevRequest({
      companyId: inbox.company_id,
      submittedBy: inbox.email_address,
      text,
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      recommendation: analysis.recommendation,
      source: 'email',
    })

    if (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high') {
      summary.risky += 1
    }

    summary.created += 1

    await updateDemoInbox(inbox.id, {
      status: 'connected',
      last_checked_at: new Date().toISOString(),
      last_error: null,
      demo_seed_index: (inbox.demo_seed_index ?? 0) + 1,
    })
  }

  return summary
}

export async function buildDemoInboxHealth(companyId: string) {
  const requests = await listDevRequestsByCompany(companyId)
  const emailRequests = requests.filter((request) => request.source === 'email')
  const stats: Record<string, InboxHealthStats> = {}
  const alerts: DemoAlertFeed = []
  const now = Date.now()
  const last24h = now - 1000 * 60 * 60 * 24
  const last7d = now - 1000 * 60 * 60 * 24 * 7

  for (const request of emailRequests) {
    const key = normalizeEmail(request.submitted_by)
    const createdAt = new Date(request.created_at).getTime()
    const current = stats[key] ?? {
      scanned24h: 0,
      risky7d: 0,
      total30d: 0,
      lastRequestAt: null,
    }

    current.total30d += 1
    if (createdAt >= last24h) current.scanned24h += 1
    if (createdAt >= last7d && (request.risk_level === 'medium' || request.risk_level === 'high')) {
      current.risky7d += 1
    }
    if (!current.lastRequestAt) current.lastRequestAt = request.created_at
    stats[key] = current

    if (request.risk_level === 'medium' || request.risk_level === 'high') {
      alerts.push({
        id: `devalert-${request.id}`,
        company_id: request.company_id,
        request_id: request.id,
        channel: 'slack',
        destination: 'demo-inbox',
        source: 'email',
        risk_level: request.risk_level,
        status: 'sent',
        submitted_by: request.submitted_by,
        error_message: null,
        created_at: request.created_at,
      })
    }
  }

  return {
    stats,
    alerts: alerts.slice(0, 12),
  }
}
