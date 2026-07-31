import type { ResendReceivedEmail } from '@/lib/inbound-email'

type ParsedMimeContent = {
  textParts: string[]
  htmlParts: string[]
  attachments: ResendReceivedEmail['attachments']
}

function splitHeadersAndBody(raw: string): { headersRaw: string; bodyRaw: string } {
  const normalized = raw.replace(/\r\n/g, '\n')
  const separatorIndex = normalized.indexOf('\n\n')

  if (separatorIndex === -1) {
    return { headersRaw: normalized, bodyRaw: '' }
  }

  return {
    headersRaw: normalized.slice(0, separatorIndex),
    bodyRaw: normalized.slice(separatorIndex + 2),
  }
}

function parseHeaders(headersRaw: string): Record<string, string> {
  const lines = headersRaw.split('\n')
  const unfolded: string[] = []

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += ` ${line.trim()}`
      continue
    }

    unfolded.push(line.trimEnd())
  }

  const headers: Record<string, string> = {}

  for (const line of unfolded) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim().toLowerCase()
    const value = line.slice(separatorIndex + 1).trim()

    if (!key) continue
    headers[key] = headers[key] ? `${headers[key]}, ${value}` : value
  }

  return headers
}

function getHeaderParameter(headerValue: string | undefined, name: string): string | null {
  if (!headerValue) return null

  const regex = new RegExp(`${name}="?([^";]+)"?`, 'i')
  const match = headerValue.match(regex)
  return match?.[1]?.trim() ?? null
}

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\n/g, '')
    .replace(/=([A-Fa-f0-9]{2})/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)))
}

function decodeMimeBody(bodyRaw: string, transferEncoding: string | undefined): string {
  const normalizedBody = bodyRaw.replace(/\r\n/g, '\n').trim()

  if (!transferEncoding) return normalizedBody

  if (/base64/i.test(transferEncoding)) {
    const compact = normalizedBody.replace(/\s+/g, '')
    try {
      return Buffer.from(compact, 'base64').toString('utf8').trim()
    } catch {
      return normalizedBody
    }
  }

  if (/quoted-printable/i.test(transferEncoding)) {
    return decodeQuotedPrintable(normalizedBody).trim()
  }

  return normalizedBody
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

function parseMimeEntity(headers: Record<string, string>, bodyRaw: string): ParsedMimeContent {
  const contentType = headers['content-type'] || 'text/plain'
  const transferEncoding = headers['content-transfer-encoding']
  const disposition = headers['content-disposition'] || ''

  if (/multipart\//i.test(contentType)) {
    const boundary = getHeaderParameter(contentType, 'boundary')
    if (!boundary) {
      return { textParts: [], htmlParts: [], attachments: [] }
    }

    const boundaryMarker = `--${boundary}`
    const rawParts = bodyRaw
      .split(boundaryMarker)
      .map((part) => part.replace(/^\n+|\n+$/g, ''))
      .filter((part) => part && part !== '--')

    return rawParts.reduce<ParsedMimeContent>((accumulator, partRaw) => {
      const cleanedPart = partRaw.endsWith('--') ? partRaw.slice(0, -2).trim() : partRaw
      const { headersRaw, bodyRaw: nestedBody } = splitHeadersAndBody(cleanedPart)
      const nestedHeaders = parseHeaders(headersRaw)
      const nestedParsed = parseMimeEntity(nestedHeaders, nestedBody)

      accumulator.textParts.push(...nestedParsed.textParts)
      accumulator.htmlParts.push(...nestedParsed.htmlParts)
      accumulator.attachments.push(...nestedParsed.attachments)
      return accumulator
    }, { textParts: [], htmlParts: [], attachments: [] })
  }

  const filename = getHeaderParameter(disposition, 'filename') || getHeaderParameter(contentType, 'name')
  const isAttachment = /attachment/i.test(disposition) || Boolean(filename)
  const decodedBody = decodeMimeBody(bodyRaw, transferEncoding)

  if (isAttachment) {
    return {
      textParts: [],
      htmlParts: [],
      attachments: [
        {
          id: crypto.randomUUID(),
          filename: filename || 'attachment',
          content_type: contentType.split(';')[0]?.trim() || 'application/octet-stream',
          content_disposition: disposition || 'attachment',
          content_id: null,
          size: Buffer.byteLength(decodedBody, 'utf8'),
        },
      ],
    }
  }

  if (/text\/html/i.test(contentType)) {
    return { textParts: [], htmlParts: [decodedBody], attachments: [] }
  }

  return { textParts: [decodedBody], htmlParts: [], attachments: [] }
}

function parseAddressList(value: string | undefined): string[] {
  if (!value) return []

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function parseEml(rawEmail: string): ResendReceivedEmail {
  const { headersRaw, bodyRaw } = splitHeadersAndBody(rawEmail)
  const headers = parseHeaders(headersRaw)
  const parsedContent = parseMimeEntity(headers, bodyRaw)

  const text = parsedContent.textParts
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
    || null

  const html = parsedContent.htmlParts
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
    || null

  return {
    id: crypto.randomUUID(),
    from: headers.from || '',
    to: parseAddressList(headers.to),
    cc: parseAddressList(headers.cc),
    bcc: parseAddressList(headers.bcc),
    reply_to: parseAddressList(headers['reply-to']),
    subject: headers.subject || '',
    text: text || (html ? htmlToText(html) : null),
    html,
    message_id: headers['message-id'] || '',
    headers,
    attachments: parsedContent.attachments,
  }
}
