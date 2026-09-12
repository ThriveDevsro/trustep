import { NextRequest, NextResponse } from 'next/server'

type RateLimitEntry = { count: number; resetAt: number }
const entries = new Map<string, RateLimitEntry>()

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

/**
 * Per-instance safety valve for expensive anonymous endpoints. Deployments with
 * multiple instances should also enforce the same limit at the CDN/WAF layer.
 */
export function enforceAnalysisRateLimit(req: NextRequest, scope: string, limit = 20, windowMs = 10 * 60_000): NextResponse | null {
  const now = Date.now()
  const key = `${scope}:${clientIp(req)}`
  const previous = entries.get(key)
  const entry = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : previous

  entry.count += 1
  entries.set(key, entry)

  if (entries.size > 10_000) {
    for (const [storedKey, storedEntry] of Array.from(entries.entries())) {
      if (storedEntry.resetAt <= now) entries.delete(storedKey)
    }
  }

  if (entry.count <= limit) return null
  return NextResponse.json(
    { error: 'Príliš veľa požiadaviek. Skúste to znova o chvíľu.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } },
  )
}
