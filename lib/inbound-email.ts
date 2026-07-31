const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

export interface ResendReceivedEmailEvent {
  type: string
  created_at: string
  data: {
    email_id: string
    created_at: string
    from: string
    to: string[]
    bcc: string[]
    cc: string[]
    message_id: string
    subject: string
    attachments: Array<{
      id: string
      filename: string
      content_type: string
      content_disposition: string | null
      content_id: string | null
    }>
  }
}

export interface ResendReceivedEmail {
  id: string
  from: string
  to: string[]
  cc: string[]
  bcc: string[]
  reply_to: string[]
  subject: string
  text: string | null
  html: string | null
  message_id: string
  headers: Record<string, string>
  attachments: Array<{
    id: string
    filename: string
    content_type: string
    content_disposition: string | null
    content_id: string | null
    size?: number
  }>
}

export function extractEmailAddress(input: string): string {
  const match = input.match(/<([^>]+)>/)
  return (match?.[1] ?? input).trim().toLowerCase()
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function getPlainEmailBody(email: ResendReceivedEmail): string {
  const text = email.text?.trim()
  if (text) return text

  const html = email.html?.trim()
  if (html) return htmlToText(html)

  return ''
}

export function resolveInboundCompanyId(recipients: string[]): string {
  for (const recipient of recipients) {
    const address = extractEmailAddress(recipient)
    const localPart = address.split('@')[0] ?? ''
    const plusPart = localPart.split('+')[1] ?? ''

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plusPart)) {
      return plusPart
    }
  }

  return DEMO_COMPANY_ID
}

export function buildEmailAnalysisText(email: ResendReceivedEmail): string {
  const replyTo = email.reply_to?.join(', ') || 'nezadané'
  const cc = email.cc?.join(', ') || 'žiadne'
  const attachments = email.attachments.length > 0
    ? email.attachments.map((attachment) => `${attachment.filename} (${attachment.content_type})`).join(', ')
    : 'žiadne'
  const body = getPlainEmailBody(email).slice(0, 12_000)

  const securityHeaders = [
    ['return-path', email.headers['return-path']],
    ['reply-to', email.headers['reply-to']],
    ['authentication-results', email.headers['authentication-results']],
    ['received-spf', email.headers['received-spf']],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  return [
    'Analyzovaný inbound e-mail:',
    `Od: ${email.from}`,
    `Komu: ${email.to.join(', ')}`,
    `Reply-To: ${replyTo}`,
    `CC: ${cc}`,
    `Predmet: ${email.subject || 'bez predmetu'}`,
    `Message-ID: ${email.message_id}`,
    `Prílohy: ${attachments}`,
    securityHeaders ? `Bezpečnostné hlavičky:\n${securityHeaders}` : '',
    body ? `Obsah e-mailu:\n${body}` : 'Obsah e-mailu: prázdny alebo nečitateľný',
  ]
    .filter(Boolean)
    .join('\n\n')
}
