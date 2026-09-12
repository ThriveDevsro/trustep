import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from 'twilio'
import { createServiceClient } from '@/lib/supabase'
import { analyzeForFraudResilient } from '@/lib/ai'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import { generateToken } from '@/lib/utils'

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

// Twilio sends form-encoded POST when an SMS arrives on your Twilio number.
// Webhook URL to set in Twilio console: https://yourdomain.com/api/analyze-sms
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const params = new URLSearchParams(rawBody)

    const from = params.get('From') ?? ''
    const body = params.get('Body') ?? ''

    // Verify the request is genuinely from Twilio (skip in dev if secret not set)
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    if (twilioAuthToken) {
      const signature  = req.headers.get('x-twilio-signature') ?? ''
      const url        = `${process.env.NEXT_PUBLIC_APP_URL}/api/analyze-sms`
      const paramObj   = Object.fromEntries(params.entries())
      const valid      = validateRequest(twilioAuthToken, signature, url, paramObj)
      if (!valid) return new NextResponse('Forbidden', { status: 403 })
    }

    if (!body.trim()) {
      // Empty SMS — reply with TwiML silence
      return twimlResponse('')
    }

    const text = `SMS od: ${from}\nObsah: ${body}`
    const analysis      = await analyzeForFraudResilient(text)
    const approverToken = generateToken()
    const supabase      = createServiceClient()
    let requestId: string | null = null

    if (supabase) {
      const { data: company } = await supabase
        .from('companies')
        .select('approver_email, name')
        .eq('id', DEMO_COMPANY_ID)
        .single()

      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          company_id:      DEMO_COMPANY_ID,
          submitted_by:    from,
          text,
          risk_level:      analysis.riskLevel,
          reasons:         analysis.reasons,
          recommendation:  analysis.recommendation,
          status:          'pending',
          source:          'sms',
          phone_from:      from,
          approver_token:  approverToken,
        })
        .select()
        .single()

      if (error) throw error

      requestId = request.id

      if (company && (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high')) {
        await sendApprovalEmail({
          to:             company.approver_email,
          requestId:      request.id,
          approverToken,
          riskLevel:      analysis.riskLevel,
          submittedBy:    `SMS od ${from}`,
          snippet:        body.slice(0, 300),
        })
      }

      await maybeSendIncidentAlert({
        requestId: request.id,
        companyId: DEMO_COMPANY_ID,
        companyName: company?.name,
        submittedBy: `SMS od ${from}`,
        source: 'sms',
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        snippet: body,
        status: 'pending',
        phoneFrom: from,
      })
    }

    // Reply to sender with a TwiML SMS acknowledging receipt
    const riskLabel = { low: 'nízke', medium: 'stredné', high: 'VYSOKÉ' }[analysis.riskLevel]
    const reply = analysis.riskLevel === 'low'
      ? `FeelsOdd: Táto správa vyzerá bezpečne (riziko: ${riskLabel}).`
      : requestId
        ? `FeelsOdd: Detegované ${riskLabel} riziko. Schvaľovateľ bol informovaný. Detail: ${process.env.NEXT_PUBLIC_APP_URL}/report/${requestId}`
        : `FeelsOdd: Detegované ${riskLabel} riziko. Správu odporúčame ďalej neotvárať a overiť mimo pôvodného kanála.`

    return twimlResponse(reply)
  } catch (err) {
    console.error('[analyze-sms]', err)
    return twimlResponse('FeelsOdd: Interná chyba analýzy.')
  }
}

function twimlResponse(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
