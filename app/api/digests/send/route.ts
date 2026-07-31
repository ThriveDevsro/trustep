import { NextRequest, NextResponse } from 'next/server'
import { sendDailyDigestForCompany } from '@/lib/digests'

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json()
    const normalizedCompanyId = String(companyId || '').trim()

    if (!normalizedCompanyId) {
      return NextResponse.json({ error: 'Chýba companyId.' }, { status: 400 })
    }

    const result = await sendDailyDigestForCompany(normalizedCompanyId)

    return NextResponse.json({
      ok: true,
      message: `Digest bol odoslaný na ${result.approverEmail}.`,
      summary: result.summary,
    })
  } catch (error) {
    console.error('[daily-digest:send]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Digest sa nepodarilo odoslať.' },
      { status: 500 }
    )
  }
}
