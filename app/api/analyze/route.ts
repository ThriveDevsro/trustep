import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { analyzeForFraudResilient } from '@/lib/ai'
import { createDevRequest } from '@/lib/dev-requests-store'
import { hasUsedGuestAnalysis, isGuestAnalysis, markGuestAnalysisUsed } from '@/lib/guest-analysis'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import type { RequestSource } from '@/lib/types'
import { generateToken } from '@/lib/utils'
import { resolveAnalysisAccess } from '@/lib/analysis-access'
import { enforceAnalysisRateLimit } from '@/lib/rate-limit'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const rateLimited = enforceAnalysisRateLimit(req, 'analyze')
    if (rateLimited) return rateLimited
    const { text, companyId: claimedCompanyId, source } = await req.json()
    const accessResult = await resolveAnalysisAccess(req, claimedCompanyId)
    if (accessResult.response) return accessResult.response
    const { companyId, submittedBy } = accessResult.access!
    const requestSource: RequestSource = ['email', 'sms', 'web', 'call', 'image'].includes(source)
      ? source
      : 'web'

    if (!text) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: CORS_HEADERS })
    }

    if (isGuestAnalysis(companyId) && hasUsedGuestAnalysis(req)) {
      return NextResponse.json(
        { error: 'Bez prihlásenia je dostupná len 1 analýza zadarmo. Pre ďalšie používanie si vytvorte účet.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // The content classifier returns a verdict only from explicit, explainable
    // combinations of signals. A pasted e-mail or a bare link is not escalated
    // simply because sender headers are unavailable.
    const analysis = await analyzeForFraudResilient(text)

    if (isGuestAnalysis(companyId)) {
      return markGuestAnalysisUsed(NextResponse.json(
        {
          id: null,
          riskLevel: analysis.riskLevel,
          reasons: analysis.reasons,
          recommendation: analysis.recommendation,
        },
        { headers: CORS_HEADERS }
      ))
    }

    const supabase = createServiceClient()

    if (!supabase) {
      if (!isGuestAnalysis(companyId)) {
        const request = await createDevRequest({
          companyId,
          submittedBy,
          text,
          riskLevel: analysis.riskLevel,
          reasons: analysis.reasons,
          recommendation: analysis.recommendation,
          source: requestSource,
        })

        return NextResponse.json(
          {
            id: request.id,
            riskLevel: analysis.riskLevel,
            reasons: analysis.reasons,
            recommendation: analysis.recommendation,
          },
          { headers: CORS_HEADERS }
        )
      }

      const response = NextResponse.json(
        {
          id: null,
          riskLevel: analysis.riskLevel,
          reasons: analysis.reasons,
          recommendation: analysis.recommendation,
          warning: 'Supabase nie je nakonfigurovaný — výsledok nie je uložený.',
        },
        { headers: CORS_HEADERS }
      )
      return isGuestAnalysis(companyId) ? markGuestAnalysisUsed(response) : response
    }

    const approverToken = generateToken()

    const { data: company } = await supabase
      .from('companies')
      .select('approver_email, name')
      .eq('id', companyId)
      .single()

    const { data: request, error } = await supabase
      .from('requests')
      .insert({
        company_id:     companyId,
        submitted_by:   submittedBy,
        text,
        risk_level:     analysis.riskLevel,
        reasons:        analysis.reasons,
        recommendation: analysis.recommendation,
        status:         'pending',
        source:         requestSource,
        approver_token: approverToken,
      })
      .select()
      .single()

    if (error) throw error

    // Send approval email only for medium/high risk when Resend is configured
    const resendKey = process.env.RESEND_API_KEY
    if (
      company &&
      resendKey &&
      resendKey !== 'your_resend_api_key' &&
      (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high')
    ) {
      await sendApprovalEmail({
        to:           company.approver_email,
        requestId:    request.id,
        approverToken,
        riskLevel:    analysis.riskLevel,
        submittedBy,
        snippet:      text.slice(0, 300),
      })
    }

    await maybeSendIncidentAlert({
      requestId: request.id,
      companyId,
      companyName: company?.name,
      submittedBy,
      source: requestSource,
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      snippet: text,
      status: 'pending',
    })

    const response = NextResponse.json(
      {
        id:             request.id,
        riskLevel:      analysis.riskLevel,
        reasons:        analysis.reasons,
        recommendation: analysis.recommendation,
      },
      { headers: CORS_HEADERS }
    )
    return isGuestAnalysis(companyId) ? markGuestAnalysisUsed(response) : response
  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS })
  }
}
