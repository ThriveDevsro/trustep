import { NextRequest, NextResponse } from 'next/server'
import { syncDemoInboxes } from '@/lib/dev-inboxes-store'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'
import { syncConnectedInboxes } from '@/lib/inbox-sync'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const companyId = String(body.companyId || '').trim()
    const inboxId = String(body.inboxId || '').trim() || undefined

    if (!companyId) {
      return NextResponse.json({ error: 'Chýba companyId.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      const user = await getRequestAppUser(req)
      if (!user || user.id !== companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const summary = await syncDemoInboxes({ companyId, inboxId })
      return NextResponse.json({ summary, warning: 'Beží demo inbox sync bez Supabase.' })
    }

    const summary = await syncConnectedInboxes(supabase, { companyId, inboxId })
    return NextResponse.json({ summary })
  } catch (error) {
    console.error('[inboxes:sync]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Inbox sync zlyhal.' }, { status: 500 })
  }
}
