import { NextRequest, NextResponse } from 'next/server'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { createServiceClient } from '@/lib/supabase'
import type { RequestSource, RiskLevel, RequestStatus } from '@/lib/types'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const alertId = params.id?.trim()
    const { companyId } = await req.json()
    const normalizedCompanyId = String(companyId || '').trim()

    if (!alertId || !normalizedCompanyId) {
      return NextResponse.json({ error: 'Chýba alert id alebo companyId.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase nie je nakonfigurovaný.' }, { status: 503 })
    }

    const { data: alert, error: alertError } = await supabase
      .from('alert_deliveries')
      .select('id, company_id, request_id, source, risk_level, status, submitted_by')
      .eq('id', alertId)
      .single()

    if (alertError || !alert) {
      return NextResponse.json({ error: 'Alert log sa nenašiel.' }, { status: 404 })
    }

    if (alert.company_id !== normalizedCompanyId) {
      return NextResponse.json({ error: 'Alert nepatrí do tohto účtu.' }, { status: 403 })
    }

    const [{ data: company }, requestResponse] = await Promise.all([
      supabase
        .from('companies')
        .select('name')
        .eq('id', normalizedCompanyId)
        .single(),
      alert.request_id
        ? supabase
            .from('requests')
            .select('id, text, reasons, source, risk_level, status, submitted_by, phone_from')
            .eq('id', alert.request_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (requestResponse.error) {
      throw requestResponse.error
    }

    const requestRecord = requestResponse.data

    const result = await maybeSendIncidentAlert({
      requestId: requestRecord?.id || undefined,
      companyId: normalizedCompanyId,
      companyName: company?.name || null,
      submittedBy: requestRecord?.submitted_by || alert.submitted_by,
      source: (requestRecord?.source || alert.source) as RequestSource,
      riskLevel: (requestRecord?.risk_level || alert.risk_level) as RiskLevel,
      reasons: Array.isArray(requestRecord?.reasons) ? requestRecord.reasons : ['Retry alert delivery'],
      snippet: requestRecord?.text || 'Retry externého alertu z TrustStep delivery logu.',
      status: (requestRecord?.status || 'pending') as RequestStatus,
      phoneFrom: requestRecord?.phone_from || undefined,
      throwOnError: true,
    })

    if (!result.sent) {
      return NextResponse.json({ error: result.skipped || 'Alert sa nepodarilo znovu odoslať.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Alert bol znovu odoslaný.' })
  } catch (error) {
    console.error('[incident-alert-retry]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Retry alert zlyhal.' },
      { status: 500 }
    )
  }
}
