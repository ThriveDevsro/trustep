import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { syncAllConnectedInboxes } from '@/lib/inbox-sync'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const configuredSecret = process.env.INBOX_SYNC_CRON_SECRET
  if (!configuredSecret || configuredSecret === 'your_inbox_sync_cron_secret') {
    return false
  }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const headerSecret = req.headers.get('x-sync-secret')?.trim()

  return bearer === configuredSecret || headerSecret === configuredSecret
}

async function runAutoSync(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase service client nie je nakonfigurovaný.' }, { status: 503 })
  }

  const summary = await syncAllConnectedInboxes(supabase, { mode: 'scheduled' })
  return NextResponse.json({ summary })
}

export async function GET(req: NextRequest) {
  try {
    return await runAutoSync(req)
  } catch (error) {
    console.error('[inboxes:auto-sync:get]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Auto-sync zlyhal.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    return await runAutoSync(req)
  } catch (error) {
    console.error('[inboxes:auto-sync:post]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Auto-sync zlyhal.' }, { status: 500 })
  }
}
