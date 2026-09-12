import { NextRequest, NextResponse } from 'next/server'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json()
    const normalizedCompanyId = String(companyId || '').trim()

    if (!normalizedCompanyId) {
      return NextResponse.json({ error: 'Chýba companyId.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    let companyName: string | null = null

    if (supabase) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', normalizedCompanyId)
        .single()

      companyName = company?.name || null
    }

    const result = await maybeSendIncidentAlert({
      companyId: normalizedCompanyId,
      companyName,
      submittedBy: 'test@truststep.local',
      source: 'email',
      riskLevel: 'high',
      reasons: [
        'Test webhook flow',
        'Overenie, že Slack alebo Teams integrácia prijíma incidenty',
      ],
      snippet: 'Toto je testovací incident z FeelsOdd. Nevyžaduje zásah a slúži len na overenie doručenia externých alertov.',
      status: 'pending',
      throwOnError: true,
    })

    if (!result.sent) {
      return NextResponse.json({ error: result.skipped || 'Test alert nebol odoslaný.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Testovací incident bol odoslaný.' })
  } catch (error) {
    console.error('[incident-alert-test]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test alert zlyhal.' },
      { status: 500 }
    )
  }
}
