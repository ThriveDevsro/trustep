import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { analyzeForFraud } from '@/lib/ai'
import { createDevRequest } from '@/lib/dev-requests-store'
import { DEMO_COMPANY_ID, hasUsedGuestAnalysis, isGuestAnalysis, markGuestAnalysisUsed } from '@/lib/guest-analysis'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import { applyUrlRiskOverrides, buildUrlHeuristics, buildUrlMetadata, extractPageInfo } from '@/lib/url-risk'
import { generateToken } from '@/lib/utils'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Block SSRF — private/loopback IP ranges must not be fetched
function isPrivateUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url)
    if (!['http:', 'https:'].includes(protocol)) return true
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true
    return false
  } catch {
    return true
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, submittedBy, companyId = DEMO_COMPANY_ID } = await req.json()

    if (!url || !submittedBy) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: CORS_HEADERS })
    }

    if (isGuestAnalysis(companyId) && hasUsedGuestAnalysis(req)) {
      return NextResponse.json(
        { error: 'Bez prihlásenia je dostupná len 1 analýza zadarmo. Pre ďalšie používanie si vytvorte účet.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    if (isPrivateUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400, headers: CORS_HEADERS })
    }

    // Fetch the page with a strict timeout
    let html = ''
    let finalUrl = url
    let fetchError = ''
    try {
      const controller = new AbortController()
      const timeout    = setTimeout(() => controller.abort(), 6000)
      const res        = await fetch(url, {
        signal:  controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 TrustStep-Scanner/1.0' },
      })
      clearTimeout(timeout)
      finalUrl = res.url || url
      const buffer = await res.arrayBuffer()
      html = new TextDecoder().decode(buffer.slice(0, 150_000))
    } catch (error: unknown) {
      fetchError = error instanceof Error && error.name === 'AbortError'
        ? 'Stránka neodpovedala (timeout)'
        : 'Stránku sa nepodarilo načítať'
    }

    const info = html
      ? extractPageInfo(html, finalUrl)
      : {
          title: '',
          hostname: new URL(url).hostname,
          hasPasswordField: false,
          hasCreditCard: false,
          hasLoginForm: false,
          hasLeadGenForm: false,
          text: '',
          pageLang: '',
          leadFormFieldCount: 0,
          hasCyrillicText: false,
        }
    const heuristics = buildUrlHeuristics(url, finalUrl, info)
    const metadata = buildUrlMetadata(heuristics, fetchError, info)

    // Build analysis prompt with all extracted signals
    const signals = [
      `URL: ${url}`,
      `Pôvodná doména: ${heuristics.originalHostname}`,
      `Finálna doména: ${info.hostname}`,
      `Heuristic skóre: ${heuristics.score}`,
      heuristics.redirectedOffDomain ? `⚠️ Redirect: pôvodná doména ${heuristics.originalHostname} presmerovala na ${heuristics.finalHostname}` : '',
      heuristics.redirectedToUnrelatedDomain ? '⚠️ Redirect smeruje na nesúvisiacu cieľovú doménu' : '',
      heuristics.redirectedToHomepage ? '⚠️ Reklamný odkaz končí na generickej homepage' : '',
      info.title ? `Nadpis stránky: ${info.title}` : '',
      info.pageLang ? `Jazyk stránky: ${info.pageLang}` : '',
      info.hasPasswordField ? '⚠️ Stránka obsahuje pole pre heslo' : '',
      info.hasCreditCard    ? '⚠️ Stránka obsahuje pole pre platobnú kartu' : '',
      info.hasLoginForm     ? '⚠️ Stránka obsahuje prihlasovací formulár' : '',
      info.hasLeadGenForm   ? '⚠️ Stránka obsahuje leadgen/kontaktný formulár' : '',
      heuristics.hasTemplateTrackingPlaceholders ? '⚠️ URL obsahuje reklamné campaign/adset placeholdery' : '',
      heuristics.hasAdPlatformMarkers ? '⚠️ URL obsahuje reklamné tracking znaky platformy Meta/Facebook' : '',
      heuristics.hasAggressiveTrackingPattern ? '⚠️ URL nesie kombináciu scam typických reklamných a tracking signálov' : '',
      heuristics.opaqueTrackingParams >= 3 ? `⚠️ URL obsahuje ${heuristics.opaqueTrackingParams} netransparentných tracking parametrov` : '',
      heuristics.hasFinanceLanguage ? '⚠️ Text alebo titulok stránky používa finančný alebo investičný jazyk' : '',
      heuristics.hasPublicFigureLanguage ? '⚠️ Text alebo titulok spomína verejnú osobu, politika alebo autoritu' : '',
      heuristics.hasLocaleMismatch ? '⚠️ Jazyk alebo región kampane nesedí s jazykom finálnej stránky' : '',
      fetchError            ? `Poznámka: ${fetchError}` : '',
      info.text             ? `\nObsah stránky:\n${info.text}` : '',
    ].filter(Boolean).join('\n')

    const analysisText = `Analyzuj túto webstránku z hľadiska podvodu/phishingu:\n\n${signals}`
    const modelAnalysis = await analyzeForFraud(analysisText)
    const analysis = applyUrlRiskOverrides(modelAnalysis, heuristics)

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
          source: 'web',
        })

        return NextResponse.json(
          {
            id: request.id,
            riskLevel: analysis.riskLevel,
            reasons: analysis.reasons,
            recommendation: analysis.recommendation,
            title: info.title,
            hostname: info.hostname,
            ...metadata,
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
          title: info.title,
          hostname: info.hostname,
          ...metadata,
        },
        { headers: CORS_HEADERS }
      )
      return isGuestAnalysis(companyId) ? markGuestAnalysisUsed(response) : response
    }

    const approverToken = generateToken()

    const { data: company } = await supabase
      .from('companies').select('approver_email, name').eq('id', companyId).single()

    const { data: request, error } = await supabase
      .from('requests')
      .insert({
        company_id:     companyId,
        submitted_by:   submittedBy,
        text:           analysisText,
        risk_level:     analysis.riskLevel,
        reasons:        analysis.reasons,
        recommendation: analysis.recommendation,
        status:         'pending',
        source:         'web',
        approver_token: approverToken,
      })
      .select().single()

    if (error) throw error

    const resendKey = process.env.RESEND_API_KEY
    if (company && resendKey && resendKey !== 'your_resend_api_key' &&
        (analysis.riskLevel === 'medium' || analysis.riskLevel === 'high')) {
      await sendApprovalEmail({
        to: company.approver_email, requestId: request.id,
        approverToken, riskLevel: analysis.riskLevel,
        submittedBy, snippet: `URL: ${url}\n${analysis.reasons.join(', ')}`,
      })
    }

    await maybeSendIncidentAlert({
      requestId: request.id,
      companyId,
      companyName: company?.name,
      submittedBy,
      source: 'web',
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      snippet: `URL: ${url}\n${analysis.recommendation}`,
      status: 'pending',
    })

    const response = NextResponse.json(
      {
        id: request.id,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendation: analysis.recommendation,
        title: info.title,
        hostname: info.hostname,
        ...metadata,
      },
      { headers: CORS_HEADERS }
    )
    return isGuestAnalysis(companyId) ? markGuestAnalysisUsed(response) : response
  } catch (err) {
    console.error('[analyze-url]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS })
  }
}
