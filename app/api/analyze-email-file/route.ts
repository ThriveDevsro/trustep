import { NextRequest, NextResponse } from 'next/server'
import { analyzeForFraudResilient } from '@/lib/ai'
import { createDevRequest } from '@/lib/dev-requests-store'
import { createServiceClient } from '@/lib/supabase'
import { buildEmailAnalysisText } from '@/lib/inbound-email'
import { parseEml } from '@/lib/eml'
import { DEMO_COMPANY_ID, hasUsedGuestAnalysis, isGuestAnalysis, markGuestAnalysisUsed } from '@/lib/guest-analysis'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { generateToken } from '@/lib/utils'
import { sendApprovalEmail } from '@/lib/resend'
import { resolveAnalysisAccess } from '@/lib/analysis-access'
import { enforceAnalysisRateLimit } from '@/lib/rate-limit'

const MAX_EMAIL_FILE_BYTES = 2 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const rateLimited = enforceAnalysisRateLimit(req, 'analyze-email-file')
    if (rateLimited) return rateLimited
    const formData = (await req.formData()) as unknown as {
      get(name: string): FormDataEntryValue | null
    }
    const emailFile = formData.get('email')
    const claimedCompanyId = String(formData.get('companyId') || DEMO_COMPANY_ID).trim()
    const accessResult = await resolveAnalysisAccess(req, claimedCompanyId)
    if (accessResult.response) return accessResult.response
    const { companyId, submittedBy } = accessResult.access!

    if (!(emailFile instanceof File) || emailFile.size === 0) {
      return NextResponse.json({ error: 'Chýba .eml súbor.' }, { status: 400 })
    }

    const fileName = emailFile.name.toLowerCase()
    if (!fileName.endsWith('.eml')) {
      return NextResponse.json({ error: 'Momentálne je podporovaný iba formát .eml.' }, { status: 400 })
    }

    if (isGuestAnalysis(companyId) && hasUsedGuestAnalysis(req)) {
      return NextResponse.json(
        { error: 'Bez prihlásenia je dostupná len 1 analýza zadarmo. Pre ďalšie používanie si vytvorte účet.' },
        { status: 403 }
      )
    }

    if (emailFile.size > MAX_EMAIL_FILE_BYTES) {
      return NextResponse.json({ error: 'Emailový súbor je príliš veľký.' }, { status: 400 })
    }

    const rawEmail = Buffer.from(await emailFile.arrayBuffer()).toString('utf8')
    const parsedEmail = parseEml(rawEmail)
    const analysisText = buildEmailAnalysisText(parsedEmail)
    const analysis = await analyzeForFraudResilient(analysisText)

    if (isGuestAnalysis(companyId)) {
      return markGuestAnalysisUsed(NextResponse.json({
        id: null,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendation: analysis.recommendation,
        subject: parsedEmail.subject,
        from: parsedEmail.from,
      }))
    }

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
          source: 'email',
        })

        return NextResponse.json({
          id: request.id,
          riskLevel: analysis.riskLevel,
          reasons: analysis.reasons,
          recommendation: analysis.recommendation,
          subject: parsedEmail.subject,
          from: parsedEmail.from,
        })
      }

      const response = NextResponse.json({
        id: null,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendation: analysis.recommendation,
        subject: parsedEmail.subject,
        from: parsedEmail.from,
        warning: 'Supabase nie je nakonfigurovaný — výsledok nie je uložený.',
      })

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
        source: 'email',
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
        snippet: analysisText.slice(0, 300),
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
      snippet: analysisText,
      status: 'pending',
    })

    const response = NextResponse.json({
      id: request.id,
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      recommendation: analysis.recommendation,
      subject: parsedEmail.subject,
      from: parsedEmail.from,
    })

    return isGuestAnalysis(companyId) ? markGuestAnalysisUsed(response) : response
  } catch (error) {
    console.error('[analyze-email-file]', error)
    return NextResponse.json({ error: 'Nepodarilo sa spracovať .eml súbor.' }, { status: 500 })
  }
}
