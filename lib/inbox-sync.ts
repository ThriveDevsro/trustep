import type { SupabaseClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'
import { analyzeForFraud } from '@/lib/ai'
import { parseEml } from '@/lib/eml'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { buildEmailAnalysisText, type ResendReceivedEmail } from '@/lib/inbound-email'
import { sendApprovalEmail } from '@/lib/resend'
import { generateToken } from '@/lib/utils'
import type { InboxProvider } from '@/lib/types'

type ConnectedInboxRecord = {
  id: string
  company_id: string
  provider: InboxProvider
  email_address: string
  display_name?: string | null
  status: 'pending' | 'connected' | 'paused' | 'error'
  scan_mode: 'auto' | 'manual' | 'digest'
  imap_host?: string | null
  imap_port?: number | null
  imap_secure?: boolean | null
  imap_username?: string | null
  imap_password?: string | null
  oauth_access_token?: string | null
  oauth_refresh_token?: string | null
  oauth_scope?: string | null
  oauth_token_expires_at?: string | null
  last_checked_at?: string | null
}

type CompanyRecord = {
  id: string
  approver_email: string
  name: string
}

type SyncInboxSummary = {
  inboxId: string
  provider: InboxProvider
  emailAddress: string
  fetched: number
  created: number
  skipped: number
  risky: number
  status: 'ok' | 'error'
  message?: string
}

type SyncSummary = {
  totalInboxes: number
  syncedInboxes: number
  fetched: number
  created: number
  skipped: number
  risky: number
  inboxes: SyncInboxSummary[]
}

type SyncMode = 'manual' | 'scheduled'

type GmailMessageListResponse = {
  messages?: Array<{ id: string; threadId?: string }>
}

type GmailPayloadPart = {
  mimeType?: string
  filename?: string
  body?: {
    data?: string
    attachmentId?: string
    size?: number
  }
  headers?: Array<{ name: string; value: string }>
  parts?: GmailPayloadPart[]
}

type GmailMessageResponse = {
  id: string
  threadId?: string
  payload?: GmailPayloadPart
}

type OutlookRecipient = {
  emailAddress?: {
    address?: string
    name?: string
  }
}

type OutlookMessageResponse = {
  id: string
  internetMessageId?: string | null
  subject?: string | null
  body?: {
    contentType?: 'html' | 'text'
    content?: string | null
  } | null
  bodyPreview?: string | null
  from?: OutlookRecipient | null
  toRecipients?: OutlookRecipient[] | null
  ccRecipients?: OutlookRecipient[] | null
  bccRecipients?: OutlookRecipient[] | null
  replyTo?: OutlookRecipient[] | null
  hasAttachments?: boolean | null
  receivedDateTime?: string | null
  internetMessageHeaders?: Array<{ name?: string; value?: string }> | null
}

type OutlookMessagesListResponse = {
  value?: OutlookMessageResponse[]
}

function getGoogleOauthConfig() {
  const clientId = process.env.GOOGLE_MAIL_CLIENT_ID
  const clientSecret = process.env.GOOGLE_MAIL_CLIENT_SECRET

  if (
    !clientId || clientId === 'your_google_mail_client_id' ||
    !clientSecret || clientSecret === 'your_google_mail_client_secret'
  ) {
    return null
  }

  return { clientId, clientSecret }
}

function getMicrosoftOauthConfig() {
  const clientId = process.env.MICROSOFT_MAIL_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_MAIL_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_MAIL_TENANT_ID || 'common'

  if (
    !clientId || clientId === 'your_microsoft_mail_client_id' ||
    !clientSecret || clientSecret === 'your_microsoft_mail_client_secret'
  ) {
    return null
  }

  return { clientId, clientSecret, tenantId }
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleOauthConfig()
  if (!config) throw new Error('Google OAuth nie je nakonfigurovaný.')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const payload = await response.json() as { access_token?: string; expires_in?: number; error?: string; error_description?: string }
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Google token refresh zlyhal.')
  }

  return payload
}

async function refreshMicrosoftAccessToken(refreshToken: string) {
  const config = getMicrosoftOauthConfig()
  if (!config) throw new Error('Microsoft OAuth nie je nakonfigurovaný.')

  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const payload = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string }
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Microsoft token refresh zlyhal.')
  }

  return payload
}

async function ensureInboxAccessToken(supabase: SupabaseClient, inbox: ConnectedInboxRecord) {
  const expiresAt = inbox.oauth_token_expires_at ? new Date(inbox.oauth_token_expires_at).getTime() : null
  const needsRefresh = !inbox.oauth_access_token || (expiresAt !== null && expiresAt <= Date.now() + 60_000)

  if (!needsRefresh) {
    return inbox.oauth_access_token as string
  }

  if (!inbox.oauth_refresh_token) {
    throw new Error('Schránka nemá refresh token. OAuth prepojenie treba obnoviť.')
  }

  if (inbox.provider === 'gmail') {
    const payload = await refreshGoogleAccessToken(inbox.oauth_refresh_token)
    const nextExpiresAt = payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null

    await supabase
      .from('connected_inboxes')
      .update({
        oauth_access_token: payload.access_token,
        oauth_token_expires_at: nextExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inbox.id)

    inbox.oauth_access_token = payload.access_token
    inbox.oauth_token_expires_at = nextExpiresAt
    return payload.access_token
  }

  if (inbox.provider === 'outlook') {
    const payload = await refreshMicrosoftAccessToken(inbox.oauth_refresh_token)
    const nextExpiresAt = payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null

    await supabase
      .from('connected_inboxes')
      .update({
        oauth_access_token: payload.access_token,
        oauth_refresh_token: payload.refresh_token || inbox.oauth_refresh_token,
        oauth_scope: payload.scope || inbox.oauth_scope,
        oauth_token_expires_at: nextExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inbox.id)

    inbox.oauth_access_token = payload.access_token
    inbox.oauth_refresh_token = payload.refresh_token || inbox.oauth_refresh_token
    inbox.oauth_scope = payload.scope || inbox.oauth_scope
    inbox.oauth_token_expires_at = nextExpiresAt
    return payload.access_token
  }

  throw new Error('IMAP sync ešte nie je implementovaný.')
}

function decodeBase64Url(input: string | undefined): string {
  if (!input) return ''

  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(paddingLength)

  try {
    return Buffer.from(padded, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

function collectGmailParts(part: GmailPayloadPart | undefined, result: {
  textParts: string[]
  htmlParts: string[]
  attachments: ResendReceivedEmail['attachments']
}) {
  if (!part) return

  const mimeType = part.mimeType || ''
  const filename = part.filename || ''
  const bodyData = decodeBase64Url(part.body?.data)

  if (filename || part.body?.attachmentId) {
    result.attachments.push({
      id: part.body?.attachmentId || crypto.randomUUID(),
      filename: filename || 'attachment',
      content_type: mimeType || 'application/octet-stream',
      content_disposition: 'attachment',
      content_id: null,
      size: part.body?.size,
    })
  } else if (/text\/plain/i.test(mimeType) && bodyData.trim()) {
    result.textParts.push(bodyData.trim())
  } else if (/text\/html/i.test(mimeType) && bodyData.trim()) {
    result.htmlParts.push(bodyData.trim())
  }

  for (const childPart of part.parts || []) {
    collectGmailParts(childPart, result)
  }
}

function gmailHeadersToRecord(headers: Array<{ name: string; value: string }> | undefined) {
  const record: Record<string, string> = {}

  for (const header of headers || []) {
    if (!header.name) continue
    record[header.name.toLowerCase()] = header.value || ''
  }

  return record
}

function mapGmailMessage(message: GmailMessageResponse): ResendReceivedEmail {
  const headers = gmailHeadersToRecord(message.payload?.headers)
  const partsResult = {
    textParts: [] as string[],
    htmlParts: [] as string[],
    attachments: [] as ResendReceivedEmail['attachments'],
  }

  collectGmailParts(message.payload, partsResult)

  return {
    id: message.id,
    from: headers.from || '',
    to: headers.to ? headers.to.split(',').map((item) => item.trim()).filter(Boolean) : [],
    cc: headers.cc ? headers.cc.split(',').map((item) => item.trim()).filter(Boolean) : [],
    bcc: headers.bcc ? headers.bcc.split(',').map((item) => item.trim()).filter(Boolean) : [],
    reply_to: headers['reply-to'] ? headers['reply-to'].split(',').map((item) => item.trim()).filter(Boolean) : [],
    subject: headers.subject || '',
    text: partsResult.textParts.join('\n\n') || null,
    html: partsResult.htmlParts.join('\n\n') || null,
    message_id: headers['message-id'] || message.id,
    headers,
    attachments: partsResult.attachments,
  }
}

async function fetchGmailEmails(supabase: SupabaseClient, inbox: ConnectedInboxRecord): Promise<ResendReceivedEmail[]> {
  const accessToken = await ensureInboxAccessToken(supabase, inbox)
  const afterEpochSeconds = inbox.last_checked_at
    ? Math.floor(new Date(inbox.last_checked_at).getTime() / 1000)
    : Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7) / 1000)

  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  listUrl.searchParams.set('maxResults', '10')
  listUrl.searchParams.set('q', `after:${afterEpochSeconds}`)

  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const listPayload = await listResponse.json() as GmailMessageListResponse & { error?: { message?: string } }
  if (!listResponse.ok) {
    throw new Error(listPayload.error?.message || 'Nepodarilo sa načítať Gmail správy.')
  }

  const messages = listPayload.messages || []
  const emails = await Promise.all(messages.map(async (message) => {
    const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const detailPayload = await detailResponse.json() as GmailMessageResponse & { error?: { message?: string } }
    if (!detailResponse.ok) {
      throw new Error(detailPayload.error?.message || 'Nepodarilo sa načítať detail Gmail správy.')
    }

    return mapGmailMessage(detailPayload)
  }))

  return emails
}

function mapRecipient(recipient: OutlookRecipient | null | undefined): string {
  const email = recipient?.emailAddress?.address?.trim() || ''
  const name = recipient?.emailAddress?.name?.trim() || ''

  if (!email) return ''
  return name && name !== email ? `${name} <${email}>` : email
}

function mapRecipientList(recipients: OutlookRecipient[] | null | undefined): string[] {
  return (recipients || [])
    .map((recipient) => mapRecipient(recipient))
    .filter(Boolean)
}

function outlookHeadersToRecord(headers: Array<{ name?: string; value?: string }> | null | undefined) {
  const record: Record<string, string> = {}

  for (const header of headers || []) {
    if (!header.name) continue
    record[header.name.toLowerCase()] = header.value || ''
  }

  return record
}

function mapOutlookMessage(message: OutlookMessageResponse): ResendReceivedEmail {
  const headers = outlookHeadersToRecord(message.internetMessageHeaders)
  const html = message.body?.contentType === 'html' ? (message.body?.content || null) : null
  const text = message.body?.contentType === 'text'
    ? (message.body?.content || null)
    : (message.bodyPreview || null)

  return {
    id: message.id,
    from: mapRecipient(message.from),
    to: mapRecipientList(message.toRecipients),
    cc: mapRecipientList(message.ccRecipients),
    bcc: mapRecipientList(message.bccRecipients),
    reply_to: mapRecipientList(message.replyTo),
    subject: message.subject || '',
    text,
    html,
    message_id: message.internetMessageId || message.id,
    headers,
    attachments: message.hasAttachments
      ? [{
          id: `${message.id}:attachment`,
          filename: 'attachment',
          content_type: 'application/octet-stream',
          content_disposition: 'attachment',
          content_id: null,
        }]
      : [],
  }
}

async function fetchOutlookEmails(supabase: SupabaseClient, inbox: ConnectedInboxRecord): Promise<ResendReceivedEmail[]> {
  const accessToken = await ensureInboxAccessToken(supabase, inbox)
  const listUrl = new URL('https://graph.microsoft.com/v1.0/me/messages')
  listUrl.searchParams.set('$top', '10')
  listUrl.searchParams.set('$orderby', 'receivedDateTime desc')
  listUrl.searchParams.set('$select', 'id,internetMessageId,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,replyTo,hasAttachments,receivedDateTime,internetMessageHeaders')

  const response = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const payload = await response.json() as OutlookMessagesListResponse & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Nepodarilo sa načítať Outlook správy.')
  }

  const lastCheckedAtMs = inbox.last_checked_at ? new Date(inbox.last_checked_at).getTime() : (Date.now() - 1000 * 60 * 60 * 24 * 7)
  const filtered = (payload.value || []).filter((message) => {
    const receivedAt = message.receivedDateTime ? new Date(message.receivedDateTime).getTime() : Date.now()
    return receivedAt > lastCheckedAtMs
  })

  return filtered.map((message) => mapOutlookMessage(message))
}

async function fetchImapEmails(_supabase: SupabaseClient, inbox: ConnectedInboxRecord): Promise<ResendReceivedEmail[]> {
  if (!inbox.imap_host || !inbox.imap_username || !inbox.imap_password) {
    throw new Error('IMAP schránke chýba server alebo prihlasovacie údaje.')
  }

  const client = new ImapFlow({
    host: inbox.imap_host,
    port: inbox.imap_port || 993,
    secure: inbox.imap_secure !== false,
    auth: {
      user: inbox.imap_username,
      pass: inbox.imap_password,
    },
  })

  try {
    await client.connect()

    const lock = await client.getMailboxLock('INBOX')
    try {
      const sinceDate = inbox.last_checked_at
        ? new Date(inbox.last_checked_at)
        : new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)

      const uidList = await client.search({ since: sinceDate }, { uid: true })
      const uids = (uidList || []).slice(-10).reverse()
      const emails: ResendReceivedEmail[] = []

      for (const uid of uids) {
        const message = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true })
        if (!message || !message.source) continue

        const rawEmail = Buffer.isBuffer(message.source)
          ? message.source.toString('utf8')
          : Buffer.from(message.source).toString('utf8')
        const parsed = parseEml(rawEmail)

        emails.push({
          ...parsed,
          id: `${inbox.id}:${message.uid || uid}`,
          message_id: parsed.message_id || `${inbox.email_address}:${message.uid || uid}`,
        })
      }

      return emails
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => undefined)
  }
}

async function fetchProviderEmails(supabase: SupabaseClient, inbox: ConnectedInboxRecord) {
  if (inbox.provider === 'gmail') {
    return fetchGmailEmails(supabase, inbox)
  }

  if (inbox.provider === 'outlook') {
    return fetchOutlookEmails(supabase, inbox)
  }

  if (inbox.provider === 'imap') {
    return fetchImapEmails(supabase, inbox)
  }

  throw new Error('Nepodporovaný provider schránky.')
}

async function createEmailRequest(
  supabase: SupabaseClient,
  company: CompanyRecord,
  inbox: ConnectedInboxRecord,
  email: ResendReceivedEmail,
) {
  const externalId = `${inbox.provider}:${email.id}`
  const { data: existingRequest } = await supabase
    .from('requests')
    .select('id, risk_level')
    .eq('external_id', externalId)
    .maybeSingle()

  if (existingRequest) {
    return { created: false, riskLevel: existingRequest.risk_level as 'low' | 'medium' | 'high' }
  }

  const analysisText = buildEmailAnalysisText(email)
  const analysis = await analyzeForFraud(analysisText)
  const approverToken = generateToken()

  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      company_id: company.id,
      submitted_by: inbox.email_address,
      text: analysisText,
      risk_level: analysis.riskLevel,
      reasons: analysis.reasons,
      recommendation: analysis.recommendation,
      status: 'pending',
      source: 'email',
      external_id: externalId,
      approver_token: approverToken,
    })
    .select('id')
    .single()

  if (error) throw error

  const resendKey = process.env.RESEND_API_KEY
  if (
    company.approver_email &&
    resendKey &&
    resendKey !== 'your_resend_api_key' &&
    (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high')
  ) {
    await sendApprovalEmail({
      to: company.approver_email,
      requestId: request.id,
      approverToken,
      riskLevel: analysis.riskLevel,
      submittedBy: inbox.email_address,
      snippet: analysisText.slice(0, 300),
    })
  }

  await maybeSendIncidentAlert({
    requestId: request.id,
    companyId: company.id,
    companyName: company.name,
    submittedBy: inbox.email_address,
    source: 'email',
    riskLevel: analysis.riskLevel,
    reasons: analysis.reasons,
    snippet: analysisText,
    status: 'pending',
  })

  return { created: true, riskLevel: analysis.riskLevel }
}

function shouldSyncInbox(inbox: ConnectedInboxRecord, mode: SyncMode): boolean {
  if (inbox.status !== 'connected') return false

  if (mode === 'manual') {
    return true
  }

  if (inbox.scan_mode === 'manual') {
    return false
  }

  if (inbox.scan_mode === 'digest') {
    const lastCheckedMs = inbox.last_checked_at ? new Date(inbox.last_checked_at).getTime() : 0
    return Date.now() - lastCheckedMs >= 1000 * 60 * 60 * 12
  }

  return true
}

async function syncInbox(
  supabase: SupabaseClient,
  company: CompanyRecord,
  inbox: ConnectedInboxRecord,
): Promise<SyncInboxSummary> {
  try {
    const emails = await fetchProviderEmails(supabase, inbox)
    let created = 0
    let skipped = 0
    let risky = 0

    for (const email of emails) {
      const result = await createEmailRequest(supabase, company, inbox, email)
      if (result.created) {
        created += 1
        if (result.riskLevel === 'medium' || result.riskLevel === 'high') {
          risky += 1
        }
      } else {
        skipped += 1
      }
    }

    await supabase
      .from('connected_inboxes')
      .update({
        last_checked_at: new Date().toISOString(),
        last_error: null,
        status: 'connected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inbox.id)

    return {
      inboxId: inbox.id,
      provider: inbox.provider,
      emailAddress: inbox.email_address,
      fetched: emails.length,
      created,
      skipped,
      risky,
      status: 'ok',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync schránky zlyhal.'

    await supabase
      .from('connected_inboxes')
      .update({
        status: 'error',
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inbox.id)

    return {
      inboxId: inbox.id,
      provider: inbox.provider,
      emailAddress: inbox.email_address,
      fetched: 0,
      created: 0,
      skipped: 0,
      risky: 0,
      status: 'error',
      message,
    }
  }
}

export async function syncConnectedInboxes(
  supabase: SupabaseClient,
  {
    companyId,
    inboxId,
    mode = 'manual',
  }: {
    companyId: string
    inboxId?: string
    mode?: SyncMode
  },
): Promise<SyncSummary> {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, approver_email, name')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    throw new Error('Firma pre sync inboxov sa nenašla.')
  }

  let query = supabase
    .from('connected_inboxes')
    .select('id, company_id, provider, email_address, display_name, status, scan_mode, imap_host, imap_port, imap_secure, imap_username, imap_password, oauth_access_token, oauth_refresh_token, oauth_scope, oauth_token_expires_at, last_checked_at')
    .eq('company_id', companyId)
    .in('provider', ['gmail', 'outlook', 'imap'])

  if (inboxId) {
    query = query.eq('id', inboxId)
  }

  const { data: inboxes, error: inboxError } = await query.order('created_at', { ascending: false })
  if (inboxError) throw inboxError

  const connectedInboxes = ((inboxes || []) as ConnectedInboxRecord[]).filter((inbox) => shouldSyncInbox(inbox, mode))

  const summary: SyncSummary = {
    totalInboxes: connectedInboxes.length,
    syncedInboxes: 0,
    fetched: 0,
    created: 0,
    skipped: 0,
    risky: 0,
    inboxes: [],
  }

  for (const inbox of connectedInboxes) {
    const inboxSummary = await syncInbox(supabase, company as CompanyRecord, inbox)
    summary.inboxes.push(inboxSummary)

    if (inboxSummary.status === 'ok') {
      summary.syncedInboxes += 1
      summary.fetched += inboxSummary.fetched
      summary.created += inboxSummary.created
      summary.skipped += inboxSummary.skipped
      summary.risky += inboxSummary.risky
    }
  }

  return summary
}

export async function syncAllConnectedInboxes(
  supabase: SupabaseClient,
  {
    mode = 'scheduled',
  }: {
    mode?: SyncMode
  } = {},
): Promise<SyncSummary> {
  const { data: inboxes, error: inboxError } = await supabase
    .from('connected_inboxes')
    .select('id, company_id, provider, email_address, display_name, status, scan_mode, imap_host, imap_port, imap_secure, imap_username, imap_password, oauth_access_token, oauth_refresh_token, oauth_scope, oauth_token_expires_at, last_checked_at')
    .in('provider', ['gmail', 'outlook', 'imap'])
    .order('created_at', { ascending: false })

  if (inboxError) throw inboxError

  const targetInboxes = ((inboxes || []) as ConnectedInboxRecord[]).filter((inbox) => shouldSyncInbox(inbox, mode))
  const companyIds = Array.from(new Set(targetInboxes.map((inbox) => inbox.company_id)))

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, approver_email, name')
    .in('id', companyIds)

  if (companiesError) throw companiesError

  const companyMap = new Map((companies || []).map((company) => [company.id, company as CompanyRecord]))

  const summary: SyncSummary = {
    totalInboxes: targetInboxes.length,
    syncedInboxes: 0,
    fetched: 0,
    created: 0,
    skipped: 0,
    risky: 0,
    inboxes: [],
  }

  for (const inbox of targetInboxes) {
    const company = companyMap.get(inbox.company_id)
    if (!company) {
      summary.inboxes.push({
        inboxId: inbox.id,
        provider: inbox.provider,
        emailAddress: inbox.email_address,
        fetched: 0,
        created: 0,
        skipped: 0,
        risky: 0,
        status: 'error',
        message: 'Firma pre inbox sa nenašla.',
      })
      continue
    }

    const inboxSummary = await syncInbox(supabase, company, inbox)
    summary.inboxes.push(inboxSummary)

    if (inboxSummary.status === 'ok') {
      summary.syncedInboxes += 1
      summary.fetched += inboxSummary.fetched
      summary.created += inboxSummary.created
      summary.skipped += inboxSummary.skipped
      summary.risky += inboxSummary.risky
    }
  }

  return summary
}
