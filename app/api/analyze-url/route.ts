import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createDevRequest } from '@/lib/dev-requests-store'
import { DEMO_COMPANY_ID, hasUsedGuestAnalysis, isGuestAnalysis, markGuestAnalysisUsed } from '@/lib/guest-analysis'
import { maybeSendIncidentAlert } from '@/lib/incident-alerts'
import { sendApprovalEmail } from '@/lib/resend'
import { applyUrlRiskOverrides, buildUrlHeuristics, buildUrlMetadata, extractPageInfo } from '@/lib/url-risk'
import { generateToken } from '@/lib/utils'
import { resolveAnalysisAccess } from '@/lib/analysis-access'
import { fetchSafePage, inspectDomain } from '@/lib/url-security'
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
    const rateLimited = enforceAnalysisRateLimit(req, 'analyze-url')
    if (rateLimited) return rateLimited
    const { url, companyId: claimedCompanyId = DEMO_COMPANY_ID } = await req.json()
    const accessResult = await resolveAnalysisAccess(req, claimedCompanyId)
    if (accessResult.response) return accessResult.response
    const { companyId, submittedBy } = accessResult.access!

    if (!url) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: CORS_HEADERS })
    }

    if (isGuestAnalysis(companyId) && hasUsedGuestAnalysis(req)) {
      return NextResponse.json(
        { error: 'Bez prihlásenia je dostupná len 1 analýza zadarmo. Pre ďalšie používanie si vytvorte účet.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    let html = ''
    let finalUrl = url
    let fetchError = ''
    try {
      const page = await fetchSafePage(url)
      html = page.html
      finalUrl = page.finalUrl
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'Invalid URL' || message === 'Unsafe URL') {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400, headers: CORS_HEADERS })
      }
      fetchError = message === 'Page is too large'
        ? 'Stránka je príliš veľká na bezpečnú kontrolu'
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
    const domainTechnical = await inspectDomain(finalUrl).catch(() => null)
    const metadata = { ...buildUrlMetadata(heuristics, fetchError, info), domainTechnical }

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
      domainTechnical ? `DNS: ${domainTechnical.ipv4Count} IPv4 záznamov${domainTechnical.mxConfigured === true ? ' · MX záznam je nastavený' : domainTechnical.mxConfigured === false ? ' · MX záznam sa nenašiel' : ''}` : '',
      domainTechnical?.tls?.validTo ? `TLS certifikát: platný do ${domainTechnical.tls.validTo}${domainTechnical.tls.issuer ? ` · vydavateľ ${domainTechnical.tls.issuer}` : ''}` : '',
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

    const analysisText = `Technická a obsahová kontrola URL:\n\n${signals}`
    // URL risk must be reproducible. Do not feed the bare URL into the generic
    // message classifier: that classifier deliberately treats unsolicited links
    // conservatively and previously turned ordinary websites into warnings.
    const analysis = applyUrlRiskOverrides(
      { riskLevel: 'low', reasons: [], recommendation: '' },
      heuristics,
    )

    if (isGuestAnalysis(companyId)) {
      return markGuestAnalysisUsed(NextResponse.json(
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
