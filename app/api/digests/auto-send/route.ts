import { NextRequest, NextResponse } from 'next/server'
import { sendDailyDigestsForAllCompanies } from '@/lib/digests'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const configuredSecret = process.env.DIGEST_CRON_SECRET
  if (!configuredSecret || configuredSecret === 'your_digest_cron_secret') {
    return false
  }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const headerSecret = req.headers.get('x-digest-secret')?.trim()

  return bearer === configuredSecret || headerSecret === configuredSecret
}

async function runAutoDigest(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await sendDailyDigestsForAllCompanies()
  const sent = results.filter((result) => result.status === 'sent').length
  const failed = results.filter((result) => result.status === 'failed').length

  return NextResponse.json({
    summary: {
      totalCompanies: results.length,
      sent,
      failed,
    },
    results,
  })
}

export async function GET(req: NextRequest) {
  try {
    return await runAutoDigest(req)
  } catch (error) {
    console.error('[digests:auto-send:get]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Auto-digest zlyhal.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    return await runAutoDigest(req)
  } catch (error) {
    console.error('[digests:auto-send:post]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Auto-digest zlyhal.' }, { status: 500 })
  }
}
