import { NextRequest, NextResponse } from 'next/server'
import { resolveAnalysisAccess } from '@/lib/analysis-access'
import { createDevRequest } from '@/lib/dev-requests-store'
import { createServiceClient } from '@/lib/supabase'
import type { RequestSource, RiskLevel } from '@/lib/types'
import { generateToken } from '@/lib/utils'

const SOURCES: RequestSource[] = ['email', 'sms', 'web', 'call', 'image']
const RISKS: RiskLevel[] = ['low', 'medium', 'high']

export async function POST(req: NextRequest) {
  const accessResult = await resolveAnalysisAccess(req)
  if (accessResult.response) return accessResult.response
  const access = accessResult.access!
  if (access.isGuest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (access.used > 0) {
    return NextResponse.json({ error: 'Hosťovský výsledok sa dá preniesť iba do nového prázdneho účtu.' }, { status: 409 })
  }

  const payload = await req.json()
  const text = String(payload.text || '').trim().slice(0, 100_000)
  const recommendation = String(payload.recommendation || '').trim().slice(0, 5_000)
  const source = SOURCES.includes(payload.source) ? payload.source as RequestSource : 'web'
  const riskLevel = RISKS.includes(payload.riskLevel) ? payload.riskLevel as RiskLevel : null
  const reasons = Array.isArray(payload.reasons)
    ? payload.reasons.slice(0, 10).map((reason: unknown) => String(reason).slice(0, 1_000))
    : []

  if (!text || !riskLevel || reasons.length === 0) {
    return NextResponse.json({ error: 'Hosťovský výsledok nie je platný.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    const request = await createDevRequest({
      companyId: access.companyId,
      submittedBy: access.submittedBy,
      text,
      riskLevel,
      reasons,
      recommendation,
      source,
    })
    return NextResponse.json({ success: true, id: request.id })
  }

  const { data: existing } = await supabase
    .from('requests')
    .select('id')
    .eq('company_id', access.companyId)
    .eq('text', text)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return NextResponse.json({ success: true, id: existing.id, duplicate: true })

  const { data, error } = await supabase
    .from('requests')
    .insert({
      company_id: access.companyId,
      submitted_by: access.submittedBy,
      text,
      risk_level: riskLevel,
      reasons,
      recommendation,
      status: 'pending',
      source,
      approver_token: generateToken(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Výsledok sa nepodarilo uložiť.' }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id })
}
