import { NextRequest, NextResponse } from 'next/server'
import { analyzeForFraud, extractFraudSignalsFromImage } from '@/lib/ai'
import { createDevRequest } from '@/lib/dev-requests-store'
import { createServiceClient } from '@/lib/supabase'
import { DEMO_COMPANY_ID, hasUsedGuestAnalysis, isGuestAnalysis, markGuestAnalysisUsed } from '@/lib/guest-analysis'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import { generateToken } from '@/lib/utils'

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
    const formData = (await req.formData()) as unknown as {
      get(name: string): FormDataEntryValue | null
    }
    const imageFile = formData.get('image') as File | null
    const submittedBy = String(formData.get('submittedBy') || '').trim()
    const companyId = String(formData.get('companyId') || DEMO_COMPANY_ID)

    if (!imageFile || !submittedBy) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: CORS_HEADERS })
    }

    if (isGuestAnalysis(companyId) && hasUsedGuestAnalysis(req)) {
      return NextResponse.json(
        { error: 'Bez prihlásenia je dostupná len 1 analýza zadarmo. Pre ďalšie používanie si vytvorte účet.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400, headers: CORS_HEADERS })
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const extracted = await extractFraudSignalsFromImage(imageBuffer, imageFile.type)

    const analysisText = [
      'Analyzuj tento screenshot z hľadiska podvodu, phishingu alebo manipulatívnej komunikácie.',
      extracted.contextSummary ? `Typ a kontext: ${extracted.contextSummary}` : '',
      extracted.suspiciousVisualSignals.length > 0
        ? `Vizuálne rizikové signály: ${extracted.suspiciousVisualSignals.join(', ')}`
        : '',
      extracted.visibleText ? `Viditeľný text zo screenshotu:\n${extracted.visibleText}` : 'Viditeľný text sa nepodarilo spoľahlivo prečítať.',
    ]
      .filter(Boolean)
      .join('\n\n')

    const analysis = await analyzeForFraud(analysisText)
    const supabase = createServiceClient()

    if (!supabase) {
      if (!isGuestAnalysis(companyId)) {
        const request = await createDevRequest({
          companyId,
          submittedBy,
          text: analysisText,
          riskLevel: analysis.riskLevel,
          reasons: analysis.reasons,
          recommendation: analysis.recommendation,
          source: 'image',
        })

        return NextResponse.json(
          {
            id: request.id,
            riskLevel: analysis.riskLevel,
            reasons: analysis.reasons,
            recommendation: analysis.recommendation,
            extractedText: extracted.visibleText,
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
          extractedText: extracted.visibleText,
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
        company_id: companyId,
        submitted_by: submittedBy,
        text: analysisText,
        risk_level: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendation: analysis.recommendation,
        status: 'pending',
        source: 'image',
        approver_token: approverToken,
      })
      .select()
      .single()

    if (error) throw error

    const resendKey = process.env.RESEND_API_KEY
    if (
      company &&
      resendKey &&
      resendKey !== 'your_resend_api_key' &&
      (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high')
    ) {
      await sendApprovalEmail({
        to: company.approver_email,
        requestId: request.id,
        approverToken,
        riskLevel: analysis.riskLevel,
        submittedBy,
        snippet: (extracted.visibleText || extracted.contextSummary || analysisText).slice(0, 300),
      })
    }

    await maybeSendIncidentAlert({
      requestId: request.id,
      companyId,
      companyName: company?.name,
      submittedBy,
      source: 'image',
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      snippet: extracted.visibleText || extracted.contextSummary || analysisText,
      status: 'pending',
    })

    const response = NextResponse.json(
      {
        id: request.id,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendation: analysis.recommendation,
        extractedText: extracted.visibleText,
      },
      { headers: CORS_HEADERS }
    )

    return isGuestAnalysis(companyId) ? markGuestAnalysisUsed(response) : response
  } catch (err) {
    console.error('[analyze-image]', err)

    if (err instanceof Error && err.message.includes('Screenshot analýza nie je nakonfigurovaná')) {
      return NextResponse.json({ error: err.message }, { status: 503, headers: CORS_HEADERS })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS })
  }
}
