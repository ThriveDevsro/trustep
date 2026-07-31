import type { AnalysisResult, RiskLevel } from '@/lib/types'

export interface ExtractedPageInfo {
  title: string
  hostname: string
  hasPasswordField: boolean
  hasCreditCard: boolean
  hasLoginForm: boolean
  hasLeadGenForm: boolean
  text: string
  pageLang: string
  leadFormFieldCount: number
  hasCyrillicText: boolean
}

export interface UrlHeuristics {
  originalHostname: string
  finalHostname: string
  redirectedOffDomain: boolean
  redirectedToUnrelatedDomain: boolean
  redirectedToHomepage: boolean
  hasTemplateTrackingPlaceholders: boolean
  hasAdPlatformMarkers: boolean
  opaqueTrackingParams: number
  hasFinanceLanguage: boolean
  hasPublicFigureLanguage: boolean
  hasLeadGenForm: boolean
  hasAggressiveTrackingPattern: boolean
  hasLocaleMismatch: boolean
  hasGenericHomepageTitle: boolean
  score: number
  reasons: string[]
}

const LOCALE_TOKEN_SET = new Set(['sk', 'cz', 'cs', 'pl', 'hu', 'ro', 'de', 'at', 'uk', 'gb', 'en', 'ru', 'ua'])

function getBaseDomain(hostname: string): string {
  const normalized = hostname.toLowerCase()
  const parts = normalized.split('.').filter(Boolean)

  if (parts.length <= 2) return normalized

  const multiPartSuffixes = new Set(['co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'co.nz'])
  const suffix = parts.slice(-2).join('.')

  if (multiPartSuffixes.has(suffix) && parts.length >= 3) {
    return parts.slice(-3).join('.')
  }

  return parts.slice(-2).join('.')
}

function extractLocaleHints(input: string): string[] {
  const tokens = decodeURIComponent(input)
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)

  return Array.from(new Set(tokens.filter((token) => LOCALE_TOKEN_SET.has(token))))
}

function isLocaleCompatible(localeHint: string, pageLang: string): boolean {
  const normalizedLang = pageLang.toLowerCase()

  switch (localeHint) {
    case 'sk':
      return normalizedLang.startsWith('sk')
    case 'cz':
    case 'cs':
      return normalizedLang.startsWith('cs') || normalizedLang.startsWith('cz')
    case 'pl':
      return normalizedLang.startsWith('pl')
    case 'hu':
      return normalizedLang.startsWith('hu')
    case 'ro':
      return normalizedLang.startsWith('ro')
    case 'de':
    case 'at':
      return normalizedLang.startsWith('de')
    case 'uk':
    case 'gb':
    case 'en':
      return normalizedLang.startsWith('en')
    case 'ru':
      return normalizedLang.startsWith('ru')
    case 'ua':
      return normalizedLang.startsWith('uk') || normalizedLang.startsWith('ua')
    default:
      return false
  }
}

export function extractPageInfo(html: string, url: string): ExtractedPageInfo {
  const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)
  const langMatch = html.match(/<html[^>]+lang=["']?([^"'\s>]+)/i)
  const title = titleMatch?.[1]?.trim() ?? ''
  const pageLang = langMatch?.[1]?.trim() ?? ''

  const leadFormFieldCount = (html.match(/<(input|select|textarea)\b/gi) ?? []).length
  const hasPasswordField = /<input[^>]+type=["']?password["']?/i.test(html)
  const hasCreditCard = /credit.?card|card.?number|cvv|cvc|payment details/i.test(html)
  const hasLoginForm = /<form[\s\S]{0,800}(sign.?in|log.?in|prihl[aá]s|password|heslo)|<input[^>]+(?:autocomplete=["']?(?:username|current-password)|name=["']?(?:username|password))/i.test(html)
  const hasLeadGenForm = /<form[\s\S]{0,800}(email|e-mail|telefon|phone|message|spr[aá]va|meno|name)/i.test(html)

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)

  const hasCyrillicText = /[А-Яа-яЁёЇїІіЄє]/.test(text)
  const { hostname } = new URL(url)

  return {
    title,
    hostname,
    hasPasswordField,
    hasCreditCard,
    hasLoginForm,
    hasLeadGenForm,
    text,
    pageLang,
    leadFormFieldCount,
    hasCyrillicText,
  }
}

export function countOpaqueTrackingParams(url: URL): number {
  let suspiciousCount = 0

  url.searchParams.forEach((value, key) => {
    const compactKey = key.replace(/[^a-z0-9]/gi, '')
    const compactValue = value.replace(/[^a-z0-9]/gi, '')
    const keyLooksHashed = /^[a-f0-9]{16,}$/i.test(compactKey)
    const valueLooksHashed = compactValue.length >= 32 && /^[a-f0-9]+$/i.test(compactValue)

    if (keyLooksHashed || valueLooksHashed) {
      suspiciousCount += 1
    }
  })

  return suspiciousCount
}

export function buildUrlHeuristics(originalUrl: string, finalUrl: string, pageInfo: ExtractedPageInfo): UrlHeuristics {
  const original = new URL(originalUrl)
  const final = new URL(finalUrl)
  const decodedOriginalUrl = decodeURIComponent(originalUrl)
  const combinedText = [decodedOriginalUrl, finalUrl, pageInfo.title, pageInfo.text].join('\n')
  const originalBaseDomain = getBaseDomain(original.hostname)
  const finalBaseDomain = getBaseDomain(final.hostname)
  const localeHints = extractLocaleHints(`${decodedOriginalUrl}\n${pageInfo.text}`)

  const redirectedOffDomain = original.hostname !== final.hostname
  const redirectedToUnrelatedDomain = originalBaseDomain !== finalBaseDomain
  const redirectedToHomepage = final.pathname === '/' && !final.search
  const opaqueTrackingParams = countOpaqueTrackingParams(original)
  const hasTemplateTrackingPlaceholders = /\{\{[^}]+\}\}|%7B%7B[^%]+%7D%7D/i.test(originalUrl)
  const hasAdPlatformMarkers = /(facebook|instagram|meta|adset|campaign|fbclid|mobile_feed|placement|creative|utm_)/i.test(decodedOriginalUrl)
  const hasFinanceLanguage = /(invest|investment|trading|broker|profit|returns?|crypto|bitcoin|fund|wealth|finan|finance|consulting|konsalt|consultation|účtovn|tax|daň|investovan|výnos|zhodnot|крипт|инвест|финанс|доход|прибыл)/i.test(combinedText)
  const hasPublicFigureLanguage = /(politik|prezident|premi[eé]r|minister|poslanec|celebrity|verejn[aá] osobnos|zn[aá]ma osobnos|public figure|политик|президент|премьер|министр|селебрити|известн)/i.test(combinedText)
  const hasAggressiveTrackingPattern = hasTemplateTrackingPlaceholders && hasAdPlatformMarkers && opaqueTrackingParams >= 3
  const hasGenericHomepageTitle = /\bhomepage\b|^home\s*[-|]/i.test(pageInfo.title)
  const hasLocaleMismatch = Boolean(
    pageInfo.pageLang &&
    localeHints.length > 0 &&
    localeHints.every((hint) => !isLocaleCompatible(hint, pageInfo.pageLang))
  )

  const reasons: string[] = []
  let score = 0

  if (redirectedToUnrelatedDomain) {
    score += 3
    reasons.push(`URL sa presmerovala na nesúvisiacu doménu ${final.hostname}, čo je pri reklamných a phishing kampaniach silný varovný signál.`)
  } else if (redirectedOffDomain) {
    score += 2
    reasons.push(`URL sa presmerovala z domény ${original.hostname} na inú doménu ${final.hostname}.`)
  }

  if (hasTemplateTrackingPlaceholders) {
    score += 2
    reasons.push('URL obsahuje reklamné template placeholdery typu campaign/adset.')
  }

  if (hasAdPlatformMarkers) {
    score += 1
    reasons.push('URL nesie znaky reklamného trackingu z Facebooku/Meta kampaní.')
  }

  if (opaqueTrackingParams >= 5) {
    score += 2
    reasons.push('URL obsahuje veľké množstvo netransparentných tracking parametrov alebo hashovaných identifikátorov.')
  } else if (opaqueTrackingParams >= 3) {
    score += 1
    reasons.push('URL obsahuje viacero netransparentných tracking parametrov alebo hashovaných identifikátorov.')
  }

  if (hasAggressiveTrackingPattern) {
    score += 2
    reasons.push('Kombinácia ad-tech placeholderov, Meta trackingu a hashovaných parametrov pripomína scam alebo affiliate funnel.')
  }

  if (pageInfo.hasLeadGenForm && hasFinanceLanguage) {
    score += 2
    reasons.push('Landing page kombinuje finančnú ponuku s leadgen formulárom, čo je častý vzorec scam reklám.')
  }

  if (pageInfo.hasLeadGenForm && pageInfo.leadFormFieldCount >= 3 && hasAggressiveTrackingPattern) {
    score += 2
    reasons.push('Reklamný redirect vedie na stránku so zberom kontaktov, čo výrazne zvyšuje riziko podvodného funnelu.')
  }

  if (hasFinanceLanguage) {
    score += 1
    reasons.push('Stránka pracuje s finančnou alebo investičnou ponukou, ktorá si vyžaduje vyššiu opatrnosť.')
  }

  if (hasPublicFigureLanguage && hasFinanceLanguage) {
    score += 3
    reasons.push('Obsah spája verejnú osobu alebo autoritu s finančnou ponukou, čo je typický znak impersonačných investičných podvodov.')
  }

  if (hasLocaleMismatch && (hasAggressiveTrackingPattern || hasFinanceLanguage || redirectedToUnrelatedDomain)) {
    score += 2
    reasons.push(`Jazyk alebo región kampane nesedí s jazykom stránky (${pageInfo.pageLang}), čo býva časté pri cezhraničných scam reklamách.`)
  }

  if (pageInfo.hasCyrillicText && localeHints.some((hint) => ['sk', 'cz', 'pl', 'hu', 'ro'].includes(hint))) {
    score += 1
    reasons.push('Obsah používa iný skript alebo jazyk, než naznačuje cieľ kampane, čo zvyšuje podozrenie na neautentický zdroj.')
  }

  if (redirectedToHomepage && hasAggressiveTrackingPattern) {
    score += 1
    reasons.push('Reklamný odkaz nekončí na konkrétnej podstránke, ale na generickej homepage, čo je pri maskovaní scam kampaní bežné.')
  }

  if (hasGenericHomepageTitle && redirectedToUnrelatedDomain) {
    score += 1
    reasons.push('Finálna stránka pôsobí ako generická homepage namiesto jasného cieľa kampane, čo znižuje dôveryhodnosť redirectu.')
  }

  return {
    originalHostname: original.hostname,
    finalHostname: final.hostname,
    redirectedOffDomain,
    redirectedToUnrelatedDomain,
    redirectedToHomepage,
    hasTemplateTrackingPlaceholders,
    hasAdPlatformMarkers,
    opaqueTrackingParams,
    hasFinanceLanguage,
    hasPublicFigureLanguage,
    hasLeadGenForm: pageInfo.hasLeadGenForm,
    hasAggressiveTrackingPattern,
    hasLocaleMismatch,
    hasGenericHomepageTitle,
    score,
    reasons,
  }
}

export function buildUrlMetadata(heuristics: UrlHeuristics, fetchError: string, info: ExtractedPageInfo) {
  return {
    originalHostname: heuristics.originalHostname,
    finalHostname: heuristics.finalHostname,
    redirectedOffDomain: heuristics.redirectedOffDomain,
    redirectedToUnrelatedDomain: heuristics.redirectedToUnrelatedDomain,
    redirectedToHomepage: heuristics.redirectedToHomepage,
    hasTemplateTrackingPlaceholders: heuristics.hasTemplateTrackingPlaceholders,
    hasAdPlatformMarkers: heuristics.hasAdPlatformMarkers,
    opaqueTrackingParams: heuristics.opaqueTrackingParams,
    hasFinanceLanguage: heuristics.hasFinanceLanguage,
    hasPublicFigureLanguage: heuristics.hasPublicFigureLanguage,
    hasLeadGenForm: heuristics.hasLeadGenForm,
    hasAggressiveTrackingPattern: heuristics.hasAggressiveTrackingPattern,
    hasLocaleMismatch: heuristics.hasLocaleMismatch,
    pageLang: info.pageLang,
    hasPasswordField: info.hasPasswordField,
    hasCreditCard: info.hasCreditCard,
    hasLoginForm: info.hasLoginForm,
    fetchError,
    heuristicScore: heuristics.score,
  }
}

function mergeReasons(primary: string[], extra: string[]) {
  const merged: string[] = []

  for (const reason of [...extra, ...primary]) {
    const normalized = reason.trim()
    if (!normalized) continue
    if (merged.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) continue
    merged.push(normalized)
  }

  return merged.slice(0, 8)
}

function maxRiskLevel(current: RiskLevel, minimum: RiskLevel): RiskLevel {
  const rank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 }
  return rank[current] >= rank[minimum] ? current : minimum
}

export function applyUrlRiskOverrides(analysis: AnalysisResult, heuristics: UrlHeuristics): AnalysisResult {
  let riskLevel = analysis.riskLevel
  let recommendation = analysis.recommendation

  if (heuristics.score >= 8) {
    riskLevel = 'high'
    recommendation = 'Neinvestujte, neregistrujte sa a nezadávajte kontaktné údaje. Overte si reklamu, verejnú osobu, cieľovú doménu aj firmu mimo pôvodnej platformy.'
  } else if (heuristics.score >= 5) {
    riskLevel = maxRiskLevel(riskLevel, 'medium')
    recommendation = riskLevel === 'medium'
      ? 'Pred akýmkoľvek klikom, registráciou alebo investovaním si overte pôvod reklamy, redirect domény, firmu a identitu propagovanej osoby mimo reklamy.'
      : recommendation
  }

  return {
    riskLevel,
    reasons: mergeReasons(analysis.reasons, heuristics.reasons),
    recommendation,
  }
}
