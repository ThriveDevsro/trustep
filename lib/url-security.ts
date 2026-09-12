import { lookup, resolveCname, resolveMx } from 'node:dns/promises'
import { isIP } from 'node:net'
import { connect as connectTls } from 'node:tls'

const MAX_REDIRECTS = 3
const MAX_PAGE_BYTES = 150_000

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19))
}

function isPrivateIp(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return isPrivateIpv4(address)
  if (family !== 6) return true

  const ip = address.toLowerCase().split('%')[0]
  if (ip === '::' || ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true
  // IPv4-mapped IPv6 may be rendered in hexadecimal form by URL parsing.
  // Reject the entire mapped range instead of risking an alternate private-IP notation.
  return ip.startsWith('::ffff:')
}

export async function assertSafeRemoteUrl(value: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid URL')
  }

  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') {
    throw new Error('Unsafe URL')
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true })

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('Unsafe URL')
  }

  return url
}

export async function fetchSafePage(value: string): Promise<{ html: string; finalUrl: string }> {
  let current = await assertSafeRemoteUrl(value)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6_000)

    let response: Response
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 FeelsOdd-Scanner/1.0' },
      })
    } finally {
      clearTimeout(timeout)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error('Too many redirects')
      current = await assertSafeRemoteUrl(new URL(location, current).toString())
      continue
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_PAGE_BYTES) throw new Error('Page is too large')

    const reader = response.body?.getReader()
    if (!reader) return { html: '', finalUrl: current.toString() }
    const chunks: Uint8Array[] = []
    let received = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        received += value.byteLength
        if (received > MAX_PAGE_BYTES) throw new Error('Page is too large')
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    const bytes = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return { html: new TextDecoder().decode(bytes), finalUrl: current.toString() }
  }

  throw new Error('Too many redirects')
}

export type DomainTechnicalSignals = {
  hostname: string
  ipv4Count: number
  mxConfigured: boolean | null
  cname: string | null
  tls: { validFrom: string | null; validTo: string | null; issuer: string | null } | null
}

async function inspectTls(hostname: string): Promise<DomainTechnicalSignals['tls']> {
  return new Promise((resolve) => {
    const socket = connectTls({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: 4_000 }, () => {
      const certificate = socket.getPeerCertificate()
      socket.end()
      const rawIssuer = certificate.issuer?.O || certificate.issuer?.CN || null
      resolve(certificate && certificate.valid_to ? {
        validFrom: certificate.valid_from || null,
        validTo: certificate.valid_to || null,
        issuer: Array.isArray(rawIssuer) ? rawIssuer.join(', ') : rawIssuer,
      } : null)
    })
    socket.once('error', () => { socket.destroy(); resolve(null) })
    socket.once('timeout', () => { socket.destroy(); resolve(null) })
  })
}

export async function inspectDomain(value: string): Promise<DomainTechnicalSignals> {
  const url = await assertSafeRemoteUrl(value)
  const hostname = url.hostname
  const [addresses, mxRecords, cnameRecords, tls] = await Promise.all([
    lookup(hostname, { all: true, verbatim: true }).catch(() => []),
    resolveMx(hostname).then((records) => records.length > 0).catch(() => null),
    resolveCname(hostname).then((records) => records[0] ?? null).catch(() => null),
    url.protocol === 'https:' ? inspectTls(hostname) : Promise.resolve(null),
  ])
  return { hostname, ipv4Count: addresses.filter(({ address }) => isIP(address) === 4).length, mxConfigured: mxRecords, cname: cnameRecords, tls }
}
