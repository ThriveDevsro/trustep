import { NextRequest, NextResponse } from 'next/server'
import { analyzeForFraudResilient, extractFraudSignalsFromImage } from '@/lib/ai'
import { createDevRequest } from '@/lib/dev-requests-store'
import { createServiceClient } from '@/lib/supabase'
import { DEMO_COMPANY_ID, hasUsedGuestAnalysis, isGuestAnalysis, markGuestAnalysisUsed } from '@/lib/guest-analysis'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import { generateToken } from '@/lib/utils'
import { resolveAnalysisAccess } from '@/lib/analysis-access'
import { enforceAnalysisRateLimit } from '@/lib/rate-limit'
import { extractPdfDocument, PdfDocumentError } from '@/lib/pdf-document'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const PDF_TYPE = 'application/pdf'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const rateLimited = enforceAnalysisRateLimit(req, 'analyze-image')
    if (rateLimited) return rateLimited
    const formData = (await req.formData()) as unknown as {
      get(name: string): FormDataEntryValue | null
    }
    const documentFile = (formData.get('document') || formData.get('image')) as File | null
    const claimedCompanyId = String(formData.get('companyId') || DEMO_COMPANY_ID)
    const accessResult = await resolveAnalysisAccess(req, claimedCompanyId)
    if (accessResult.response) return accessResult.response
    const { companyId, submittedBy } = accessResult.access!

    if (!documentFile) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: CORS_HEADERS })
    }

    if (isGuestAnalysis(companyId) && hasUsedGuestAnalysis(req)) {
      return NextResponse.json(
        { error: 'Bez prihlásenia je dostupná len 1 analýza zadarmo. Pre ďalšie používanie si vytvorte účet.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    const isPdf = documentFile.type === PDF_TYPE || documentFile.name.toLowerCase().endsWith('.pdf')
    const isImage = SUPPORTED_IMAGE_TYPES.has(documentFile.type)
    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: 'Podporujeme PDF, PNG, JPG, WEBP a HEIC.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (documentFile.size === 0 || documentFile.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { error: 'Dokument môže mať najviac 15 MB.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const documentBuffer = Buffer.from(await documentFile.arrayBuffer())
    const extracted = isPdf
      ? await extractPdfDocument(documentBuffer).then((pdf) => ({
          visibleText: pdf.text,
          contextSummary: `PDF dokument · ${pdf.pageCount} ${pdf.pageCount === 1 ? 'strana' : 'strán'} · text získaný ${pdf.extraction === 'ocr' ? 'pomocou OCR' : 'priamo z dokumentu'}.`,
          suspiciousVisualSignals: [] as string[],
        }))
      : await extractFraudSignalsFromImage(documentBuffer, documentFile.type)

    const analysisText = [
      `Over tento ${isPdf ? 'PDF dokument' : 'screenshot'} ako digitálnu komunikáciu: kto sa za koho vydáva, čo od príjemcu žiada, či dostupné údaje podporujú tvrdenú identitu a aké manipulačné alebo technické signály obsahuje.`,
      extracted.contextSummary ? `Typ a kontext: ${extracted.contextSummary}` : '',
      extracted.suspiciousVisualSignals.length > 0
        ? `Vizuálne rizikové signály: ${extracted.suspiciousVisualSignals.join(', ')}`
        : '',
      extracted.visibleText ? `Viditeľný text zo screenshotu:\n${extracted.visibleText}` : 'Viditeľný text sa nepodarilo spoľahlivo prečítať.',
    ]
      .filter(Boolean)
      .join('\n\n')

    const analysis = await analyzeForFraudResilient(analysisText)

    if (isGuestAnalysis(companyId)) {
      return markGuestAnalysisUsed(NextResponse.json(
        {
          id: null,
          riskLevel: analysis.riskLevel,
          reasons: analysis.reasons,
          recommendation: analysis.recommendation,
          extractedText: extracted.visibleText,
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
    if (err instanceof PdfDocumentError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: CORS_HEADERS })
    }

    console.error('[analyze-image]', err)

    if (err instanceof Error && err.message.includes('Screenshot analýza nie je nakonfigurovaná')) {
      return NextResponse.json({ error: err.message }, { status: 503, headers: CORS_HEADERS })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS })
  }
}
