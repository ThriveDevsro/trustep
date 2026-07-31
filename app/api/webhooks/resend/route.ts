import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { analyzeForFraud } from '@/lib/ai'
import {
  buildEmailAnalysisText,
  extractEmailAddress,
  type ResendReceivedEmail,
  type ResendReceivedEmailEvent,
  resolveInboundCompanyId,
} from '@/lib/inbound-email'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import { createServiceClient } from '@/lib/supabase'
import { generateToken } from '@/lib/utils'

async function fetchReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 'your_resend_api_key') {
    throw new Error('RESEND_API_KEY is not configured for inbound email retrieval.')
  }

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to retrieve inbound email ${emailId}: ${response.status}`)
  }

  return response.json() as Promise<ResendReceivedEmail>
}

function verifyResendWebhook(payload: string, req: NextRequest): ResendReceivedEmailEvent {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('RESEND_WEBHOOK_SECRET is not configured.')
  }

  const webhook = new Webhook(secret)

  return webhook.verify(payload, {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }) as ResendReceivedEmailEvent
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const event = verifyResendWebhook(payload, req)

    if (event.type !== 'email.received') {
      return NextResponse.json({ ok: true, ignored: event.type })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase service client is not configured' }, { status: 503 })
    }

    const existing = await supabase
      .from('requests')
      .select('id')
      .eq('external_id', event.data.email_id)
      .maybeSingle()

    if (existing.data?.id) {
      return NextResponse.json({ ok: true, duplicate: true, id: existing.data.id })
    }

    const email = await fetchReceivedEmail(event.data.email_id)
    const companyId = resolveInboundCompanyId(email.to)
    const submittedBy = extractEmailAddress(email.from)
    const text = buildEmailAnalysisText(email)
    const analysis = await analyzeForFraud(text)
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
        text,
        risk_level: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendation: analysis.recommendation,
        status: 'pending',
        source: 'email',
        approver_token: approverToken,
        external_id: event.data.email_id,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, duplicate: true })
      }
      throw error
    }

    const resendKey = process.env.RESEND_API_KEY
    if (
      company &&
      resendKey &&
      resendKey !== 'your_resend_api_key' &&
      (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high')
    ) {
      const snippet = [email.subject, text].filter(Boolean).join('\n').slice(0, 300)

      await sendApprovalEmail({
        to: company.approver_email,
        requestId: request.id,
        approverToken,
        riskLevel: analysis.riskLevel,
        submittedBy,
        snippet,
      })
    }

    await maybeSendIncidentAlert({
      requestId: request.id,
      companyId,
      companyName: company?.name,
      submittedBy,
      source: 'email',
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      snippet: [email.subject, text].filter(Boolean).join('\n'),
      status: 'pending',
    })

    return NextResponse.json({ ok: true, id: request.id })
  } catch (error) {
    console.error('[resend-webhook]', error)
    return NextResponse.json({ error: 'Invalid or failed webhook processing' }, { status: 400 })
  }
}
