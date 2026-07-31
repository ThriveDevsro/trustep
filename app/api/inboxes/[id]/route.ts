import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { deleteDemoInbox, getDemoInboxById, updateDemoInbox } from '@/lib/dev-inboxes-store'
import { getRequestAppUser } from '@/lib/server-auth'

const VALID_STATUSES = new Set(['pending', 'connected', 'paused', 'error'])
const VALID_SCAN_MODES = new Set(['auto', 'manual', 'digest'])
const SAFE_INBOX_COLUMNS = 'id, company_id, provider, email_address, display_name, connection_method, status, scan_mode, imap_host, imap_port, imap_secure, last_checked_at, last_error, created_at, updated_at'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id?.trim()
    if (!id) {
      return NextResponse.json({ error: 'Chýba inbox id.' }, { status: 400 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status && VALID_STATUSES.has(String(body.status))) {
      updates.status = body.status
    }

    if (typeof body.lastError === 'string') {
      updates.last_error = body.lastError.trim() || null
    }

    if (body.lastCheckedAt === null || typeof body.lastCheckedAt === 'string') {
      updates.last_checked_at = body.lastCheckedAt
    }

    if (typeof body.displayName === 'string') {
      updates.display_name = body.displayName.trim() || null
    }

    if (typeof body.scanMode === 'string') {
      const scanMode = body.scanMode.trim()
      if (!VALID_SCAN_MODES.has(scanMode)) {
        return NextResponse.json({ error: 'Neplatný režim skenovania.' }, { status: 400 })
      }
      updates.scan_mode = scanMode
    }

    const supabase = createServiceClient()
    if (!supabase) {
      const user = await getRequestAppUser(req)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const existingInbox = await getDemoInboxById(id)
      if (!existingInbox || existingInbox.company_id !== user.id) {
        return NextResponse.json({ error: 'Inbox sa nenašiel.' }, { status: 404 })
      }

      const inbox = await updateDemoInbox(id, updates)
      if (!inbox) {
        return NextResponse.json({ error: 'Inbox sa nenašiel.' }, { status: 404 })
      }

      return NextResponse.json({ inbox, warning: 'Beží demo inbox režim bez Supabase.' })
    }

    const wantsImapUpdate =
      'imapHost' in body ||
      'imapPort' in body ||
      'imapSecure' in body ||
      'imapUsername' in body ||
      'imapPassword' in body

    if (wantsImapUpdate) {
      const { data: existingInbox, error: existingInboxError } = await supabase
        .from('connected_inboxes')
        .select('provider, status, imap_host, imap_port, imap_secure, imap_username, imap_password')
        .eq('id', id)
        .single()

      if (existingInboxError || !existingInbox) {
        return NextResponse.json({ error: 'Inbox sa nenašiel.' }, { status: 404 })
      }

      if (existingInbox.provider !== 'imap') {
        return NextResponse.json({ error: 'IMAP nastavenia sa dajú meniť len pri IMAP schránkach.' }, { status: 400 })
      }

      const nextImapHost = typeof body.imapHost === 'string'
        ? (body.imapHost.trim() || existingInbox.imap_host || '')
        : (existingInbox.imap_host || '')
      const nextImapPort = body.imapPort
        ? Number(body.imapPort)
        : (existingInbox.imap_port || 993)
      const nextImapSecure = typeof body.imapSecure === 'boolean'
        ? body.imapSecure
        : existingInbox.imap_secure !== false
      const nextImapUsername = typeof body.imapUsername === 'string'
        ? (body.imapUsername.trim() || existingInbox.imap_username || '')
        : (existingInbox.imap_username || '')
      const nextImapPassword = typeof body.imapPassword === 'string'
        ? (body.imapPassword.trim() || existingInbox.imap_password || '')
        : (existingInbox.imap_password || '')

      if (!nextImapHost || !nextImapUsername || !nextImapPassword) {
        return NextResponse.json({ error: 'IMAP schránka potrebuje server, používateľské meno a heslo.' }, { status: 400 })
      }

      updates.imap_host = nextImapHost
      updates.imap_port = nextImapPort
      updates.imap_secure = nextImapSecure
      updates.imap_username = nextImapUsername
      updates.imap_password = nextImapPassword
      updates.last_error = null

      if (!body.status && (existingInbox.status === 'error' || existingInbox.status === 'pending')) {
        updates.status = 'connected'
      }
    }

    const { data, error } = await supabase
      .from('connected_inboxes')
      .update(updates)
      .eq('id', id)
      .select(SAFE_INBOX_COLUMNS)
      .single()

    if (error) throw error

    return NextResponse.json({ inbox: data })
  } catch (error) {
    console.error('[inboxes:update]', error)
    return NextResponse.json({ error: 'Nepodarilo sa upraviť inbox.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id?.trim()
    if (!id) {
      return NextResponse.json({ error: 'Chýba inbox id.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      const user = await getRequestAppUser(req)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const existingInbox = await getDemoInboxById(id)
      if (!existingInbox || existingInbox.company_id !== user.id) {
        return NextResponse.json({ error: 'Inbox sa nenašiel.' }, { status: 404 })
      }

      await deleteDemoInbox(id)
      return NextResponse.json({ success: true, warning: 'Beží demo inbox režim bez Supabase.' })
    }

    const { error } = await supabase
      .from('connected_inboxes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[inboxes:delete]', error)
    return NextResponse.json({ error: 'Nepodarilo sa zmazať inbox.' }, { status: 500 })
  }
}
