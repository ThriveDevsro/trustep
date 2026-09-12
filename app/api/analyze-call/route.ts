import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { analyzeForFraudResilient, transcribeAudio } from '@/lib/ai'
import { createDevRequest } from '@/lib/dev-requests-store'
import { DEMO_COMPANY_ID, hasUsedGuestAnalysis, isGuestAnalysis, markGuestAnalysisUsed } from '@/lib/guest-analysis'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import { generateToken } from '@/lib/utils'
import { resolveAnalysisAccess } from '@/lib/analysis-access'
import twilio from 'twilio'
import { enforceAnalysisRateLimit } from '@/lib/rate-limit'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const MAX_AUDIO_BYTES = 15 * 1024 * 1024
const SUPPORTED_AUDIO_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg',
])

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Handles two cases:
//   1. Twilio recording webhook — form-encoded, contains RecordingUrl
//   2. Manual upload from /submit-call — multipart form with audio file
export async function POST(req: NextRequest) {
  if (process.env.CALL_ANALYSIS_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Analýza nahrávok hovorov zatiaľ nie je dostupná.' },
      { status: 503, headers: CORS_HEADERS },
    )
  }

  const contentType = req.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      return await handleManualUpload(req)
    } else {
      return await handleTwilioWebhook(req)
    }
  } catch (err) {
    console.error('[analyze-call]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS })
  }
}

// ─── Twilio recording webhook ────────────────────────────────────────────────
// Set in Twilio console: Call Recording Status Callback URL → /api/analyze-call
// Requires: Enable call recording on the Twilio number

async function handleTwilioWebhook(req: NextRequest) {
  const rawBody   = await req.text()
  const params    = new URLSearchParams(rawBody)

  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const signature = req.headers.get('x-twilio-signature')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const webhookUrl = appUrl ? `${appUrl}/api/analyze-call` : req.url
  const paramsObject = Object.fromEntries(params.entries())
  if (!twilioToken || !signature || !twilio.validateRequest(twilioToken, signature, webhookUrl, paramsObject)) {
    return NextResponse.json({ error: 'Invalid Twilio signature' }, { status: 403 })
  }

  const recordingUrl = params.get('RecordingUrl')
  const from         = params.get('From') ?? 'unknown'
  const duration     = params.get('RecordingDuration') ?? '0'

  if (!recordingUrl) {
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  let recordingHost = ''
  try {
    recordingHost = new URL(recordingUrl).hostname.toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid recording URL' }, { status: 400 })
  }
  if (recordingHost !== 'api.twilio.com' && !recordingHost.endsWith('.twilio.com')) {
    return NextResponse.json({ error: 'Unexpected recording host' }, { status: 400 })
  }

  // Download the recording (Twilio serves mp3 when you append .mp3)
  const audioUrl = `${recordingUrl}.mp3`
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
  const twilioAuthToken   = process.env.TWILIO_AUTH_TOKEN ?? ''

  const audioRes = await fetch(audioUrl, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
    },
  })

  if (!audioRes.ok) throw new Error(`Failed to fetch recording: ${audioRes.status}`)
  if (Number(audioRes.headers.get('content-length') || 0) > MAX_AUDIO_BYTES) {
    throw new Error('Recording is too large')
  }

  const audioBuffer   = Buffer.from(await audioRes.arrayBuffer())
  const transcription = await transcribeAudio(audioBuffer, 'call.mp3')
  await saveAndNotify({
    text:        `Hovor od: ${from} (${duration}s)\nTranskripcia:\n${transcription}`,
    submittedBy: from,
    phoneFrom:   from,
    source:      'call',
  })

  // Twilio expects TwiML response (even for recording callbacks)
  return new NextResponse('<?xml version="1.0"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}

// ─── Manual audio upload ─────────────────────────────────────────────────────

async function handleManualUpload(req: NextRequest) {
  const rateLimited = enforceAnalysisRateLimit(req, 'analyze-call')
  if (rateLimited) return rateLimited
  const formData    = (await req.formData()) as unknown as {
    get(name: string): FormDataEntryValue | null
  }
  const audioFile   = formData.get('audio') as File | null
  const claimedCompanyId = (formData.get('companyId') as string) || DEMO_COMPANY_ID
  const accessResult = await resolveAnalysisAccess(req, claimedCompanyId)
  if (accessResult.response) return accessResult.response
  const { companyId, submittedBy } = accessResult.access!

  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400, headers: CORS_HEADERS })
  }

  if (!SUPPORTED_AUDIO_TYPES.has(audioFile.type) || audioFile.size === 0 || audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Unsupported or oversized audio file' }, { status: 400, headers: CORS_HEADERS })
  }

  if (isGuestAnalysis(companyId) && hasUsedGuestAnalysis(req)) {
    return NextResponse.json(
      { error: 'Bez prihlásenia je dostupná len 1 analýza zadarmo. Pre ďalšie používanie si vytvorte účet.' },
      { status: 403, headers: CORS_HEADERS }
    )
  }

  const audioBuffer   = Buffer.from(await audioFile.arrayBuffer())
  const transcription = await transcribeAudio(audioBuffer, audioFile.name)

  const result = await saveAndNotify({
    text:        `Nahrávka hovoru od: ${submittedBy}\nTranskripcia:\n${transcription}`,
    submittedBy,
    source:      'call',
    companyId,
  })

  const response = NextResponse.json(
    { id: result.id, riskLevel: result.riskLevel, reasons: result.reasons, transcription },
    { headers: CORS_HEADERS }
  )
  return isGuestAnalysis(companyId) ? markGuestAnalysisUsed(response) : response
}

// ─── Shared: analyze + save + notify ────────────────────────────────────────

async function saveAndNotify({
  text, submittedBy, phoneFrom, source, companyId = DEMO_COMPANY_ID,
}: {
  text: string
  submittedBy: string
  phoneFrom?: string
  source: 'sms' | 'call'
  companyId?: string
}) {
  const analysis      = await analyzeForFraudResilient(text)

  if (isGuestAnalysis(companyId)) {
    return {
      id: null,
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      recommendation: analysis.recommendation,
    }
  }

  const approverToken = generateToken()
  const supabase      = createServiceClient()

  if (!supabase) {
    if (!isGuestAnalysis(companyId)) {
      const request = await createDevRequest({
        companyId,
        submittedBy,
        text,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendation: analysis.recommendation,
        source,
        phoneFrom,
      })

      return { id: request.id, riskLevel: analysis.riskLevel, reasons: analysis.reasons }
    }

    return { id: null, riskLevel: analysis.riskLevel, reasons: analysis.reasons }
  }

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
      source,
      phone_from:     phoneFrom,
      approver_token: approverToken,
    })
    .select()
    .single()

  if (error) throw error

  if (company && (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high')) {
    await sendApprovalEmail({
      to:          company.approver_email,
      requestId:   request.id,
      approverToken,
      riskLevel:   analysis.riskLevel,
      submittedBy,
      snippet:     text.slice(0, 300),
    })
  }

  await maybeSendIncidentAlert({
    requestId: request.id,
    companyId,
    companyName: company?.name,
    submittedBy,
    source,
    riskLevel: analysis.riskLevel,
    reasons: analysis.reasons,
    snippet: text,
    status: 'pending',
    phoneFrom,
  })

  return { id: request.id, riskLevel: analysis.riskLevel, reasons: analysis.reasons }
}
