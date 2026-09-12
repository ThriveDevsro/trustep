import { NextRequest, NextResponse } from 'next/server'
import { buildDemoInboxHealth, createDemoInbox, listDemoInboxes } from '@/lib/dev-inboxes-store'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'
import type { AlertDelivery, InboxConnectionMethod, InboxProvider } from '@/lib/types'
import { INBOX_PROVIDERS } from '@/lib/mailboxes'

const VALID_PROVIDERS = new Set<InboxProvider>(['gmail', 'outlook', 'imap'])
const VALID_SCAN_MODES = new Set(['auto', 'manual', 'digest'])
const SAFE_INBOX_COLUMNS = 'id, company_id, provider, email_address, display_name, connection_method, status, scan_mode, imap_host, imap_port, imap_secure, last_checked_at, last_error, created_at, updated_at'
const PROVIDER_METHOD_MAP: Record<InboxProvider, InboxConnectionMethod> = {
  gmail: 'oauth',
  outlook: 'oauth',
  imap: 'imap',
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get('companyId')?.trim()
    if (!companyId) {
      return NextResponse.json({ error: 'Chýba companyId.' }, { status: 400 })
    }
    const user = await getRequestAppUser(req)
    if (!user || user.id !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      const [inboxes, health] = await Promise.all([
        listDemoInboxes(companyId),
        buildDemoInboxHealth(companyId),
      ])

      return NextResponse.json({
        inboxes,
        providers: INBOX_PROVIDERS,
        stats: health.stats,
        alerts: health.alerts,
      })
    }

    const statsWindowStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
    const [inboxesResponse, requestsResponse, alertsResponse] = await Promise.all([
      supabase
        .from('connected_inboxes')
        .select(SAFE_INBOX_COLUMNS)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('requests')
        .select('submitted_by, risk_level, created_at')
        .eq('company_id', companyId)
        .eq('source', 'email')
        .gte('created_at', statsWindowStart)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('alert_deliveries')
        .select('id, company_id, request_id, channel, destination, source, risk_level, status, submitted_by, error_message, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    if (inboxesResponse.error) throw inboxesResponse.error
    if (requestsResponse.error) throw requestsResponse.error
    if (alertsResponse.error) throw alertsResponse.error

    const statsBySubmittedBy: Record<string, {
      scanned24h: number
      risky7d: number
      total30d: number
      lastRequestAt: string | null
    }> = {}

    const now = Date.now()
    const last24h = now - 1000 * 60 * 60 * 24
    const last7d = now - 1000 * 60 * 60 * 24 * 7

    for (const request of requestsResponse.data ?? []) {
      const submittedBy = String(request.submitted_by || '').trim().toLowerCase()
      if (!submittedBy) continue

      const createdAt = request.created_at ? new Date(request.created_at).getTime() : 0
      const current = statsBySubmittedBy[submittedBy] ?? {
        scanned24h: 0,
        risky7d: 0,
        total30d: 0,
        lastRequestAt: null,
      }

      current.total30d += 1
      if (createdAt >= last24h) {
        current.scanned24h += 1
      }

      if (
        createdAt >= last7d &&
        (request.risk_level === 'medium' || request.risk_level === 'high')
      ) {
        current.risky7d += 1
      }

      if (!current.lastRequestAt) {
        current.lastRequestAt = request.created_at
      }

      statsBySubmittedBy[submittedBy] = current
    }

    return NextResponse.json({
      inboxes: inboxesResponse.data ?? [],
      providers: INBOX_PROVIDERS,
      stats: statsBySubmittedBy,
      alerts: (alertsResponse.data ?? []) as AlertDelivery[],
    })
  } catch (error) {
    console.error('[inboxes:get]', error)
    return NextResponse.json({ error: 'Nepodarilo sa načítať inboxy.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const companyId = String(body.companyId || '').trim()
    const provider = String(body.provider || '').trim() as InboxProvider
    const requestedEmailAddress = String(body.emailAddress || '').trim().toLowerCase()
    const displayName = String(body.displayName || '').trim()
    const scanMode = String(body.scanMode || 'auto').trim()
    const imapHost = String(body.imapHost || '').trim()
    const imapPort = Number(body.imapPort || 0)
    const imapSecure = body.imapSecure !== false
    const imapUsername = String(body.imapUsername || '').trim()
    const imapPassword = String(body.imapPassword || '').trim()

    if (!companyId || !VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Chýbajú povinné polia.' }, { status: 400 })
    }
    const user = await getRequestAppUser(req)
    if (!user || user.id !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // OAuth returns the final mailbox address in its callback. Until then we use
    // the signed-in address, so Google/Microsoft can be connected in one click.
    const emailAddress = requestedEmailAddress || (provider === 'imap' ? '' : user.email.trim().toLowerCase())
    if (!emailAddress) {
      return NextResponse.json({ error: 'Pre túto schránku je potrebná e-mailová adresa.' }, { status: 400 })
    }

    if (!VALID_SCAN_MODES.has(scanMode)) {
      return NextResponse.json({ error: 'Neplatný režim skenovania.' }, { status: 400 })
    }

    if (provider === 'imap' && (!imapHost || !imapUsername || !imapPassword)) {
      return NextResponse.json({ error: 'Pre IMAP je potrebný server, používateľské meno a heslo.' }, { status: 400 })
    }

    const initialStatus = provider === 'imap' ? 'connected' : 'pending'

    const supabase = createServiceClient()
    if (!supabase) {
      const inbox = await createDemoInbox({
        companyId,
        provider,
        emailAddress,
        displayName,
        scanMode: scanMode as 'auto' | 'manual' | 'digest',
        imapHost,
        imapPort: provider === 'imap' ? (imapPort || 993) : undefined,
        imapSecure,
        imapUsername,
        imapPassword,
      })

      return NextResponse.json(
        {
          inbox,
          warning: 'Beží demo inbox režim bez Supabase. Sync vytvorí ukážkové e-mailové incidenty.',
        },
        { status: 200 }
      )
    }

    const { data, error } = await supabase
      .from('connected_inboxes')
      .insert({
        company_id: companyId,
        provider,
        email_address: emailAddress,
        display_name: displayName || null,
        connection_method: PROVIDER_METHOD_MAP[provider],
        status: initialStatus,
        scan_mode: scanMode,
        imap_host: provider === 'imap' ? imapHost : null,
        imap_port: provider === 'imap' ? (imapPort || 993) : null,
        imap_secure: provider === 'imap' ? imapSecure : null,
        imap_username: provider === 'imap' ? imapUsername : null,
        imap_password: provider === 'imap' ? imapPassword : null,
      })
      .select(SAFE_INBOX_COLUMNS)
      .single()

    if (error) throw error

    return NextResponse.json({ inbox: data })
  } catch (error) {
    console.error('[inboxes:create]', error)
    return NextResponse.json({ error: 'Nepodarilo sa vytvoriť inbox.' }, { status: 500 })
  }
}
