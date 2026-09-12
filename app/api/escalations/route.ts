import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getRequestAppUser } from '@/lib/server-auth'
import { createDevRequest } from '@/lib/dev-requests-store'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import type { RiskLevel } from '@/lib/types'
import { generateToken } from '@/lib/utils'

const VALID_RISKS = new Set<RiskLevel>(['low', 'medium', 'high'])

function cleanList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
    : []
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestAppUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const riskLevel = String(body.riskLevel || '').toLowerCase() as RiskLevel
    const originalText = String(body.originalText || '').trim()
    const note = String(body.note || '').trim()
    const recipient = String(body.recipient || 'Approver').trim()
    const verdict = String(body.verdict || 'FeelsOdd incident').trim()
    const reasons = cleanList(body.reasons)
    const doNow = cleanList(body.doNow)

    if (!VALID_RISKS.has(riskLevel) || !originalText) {
      return NextResponse.json({ error: 'Missing incident fields' }, { status: 400 })
    }

    const text = [
      `Escalation to: ${recipient}`,
      note ? `Note: ${note}` : '',
      `Verdict: ${verdict}`,
      '',
      originalText,
    ].filter(Boolean).join('\n')

    const recommendation = doNow.length > 0 ? doNow.join('. ') : 'Overte mimo pôvodnej správy.'
    const supabase = createServiceClient()

    if (!supabase) {
      const request = await createDevRequest({
        companyId: user.id,
        submittedBy: user.email,
        text,
        riskLevel,
        reasons,
        recommendation,
        source: 'web',
        status: 'pending',
      })

      return NextResponse.json({ id: request.id, status: request.status, reportUrl: `/report/${request.id}` })
    }

    const approverToken = generateToken()
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', user.id)
      .single()

    const { data: request, error } = await supabase
      .from('requests')
      .insert({
        company_id: user.id,
        submitted_by: user.email,
        text,
        risk_level: riskLevel,
        reasons,
        recommendation,
        status: 'pending',
        source: 'web',
        approver_token: approverToken,
      })
      .select('id, status')
      .single()

    if (error) throw error

    await maybeSendIncidentAlert({
      requestId: request.id,
      companyId: user.id,
      companyName: company?.name,
      submittedBy: user.email,
      source: 'web',
      riskLevel,
      reasons,
      snippet: text,
      status: 'pending',
    })

    return NextResponse.json({ id: request.id, status: request.status, reportUrl: `/report/${request.id}` })
  } catch (error) {
    console.error('[escalations]', error)
    return NextResponse.json({ error: 'Escalation failed' }, { status: 500 })
  }
}
