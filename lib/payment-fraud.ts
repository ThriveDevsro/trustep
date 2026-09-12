import type { AnalysisResult, RiskLevel } from '@/lib/types'

const IBAN_PATTERN = /\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]){11,30}\b/i

function maxRisk(current: RiskLevel, minimum: RiskLevel): RiskLevel {
  const order: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 }
  return order[current] >= order[minimum] ? current : minimum
}

export function applyPaymentFraudOverrides(analysis: AnalysisResult, text: string): AnalysisResult {
  const normalized = text.toLowerCase()
  const hasIban = IBAN_PATTERN.test(text)
  const hasPayment = /\b(platba|prevod|uhrad|faktúr|invoice|payment|bank transfer|beneficiary)\b/i.test(text)
  const hasChange = /\b(zme(?:n|ň)\S*|nov[ýá]|aktualizovan[ýá]|updated|change)\b.{0,80}\b(iban|účet|account|bankov[ée]? údaj|beneficiary|platobn)/i.test(normalized)
    || /\b(iban|účet|account|beneficiary|bankov[ée]? údaj)\b.{0,80}\b(zme(?:n|ň)\S*|nov[ýá]|aktualizovan[ýá]|updated|change)\b/i.test(normalized)
  const hasUrgency = /urgent|okamžite|hneď|ihneď|dnes|do konca dňa|final notice/i.test(normalized)
  const hasAuthority = /riaditeľ|ceo|konateľ|dodávateľ|supplier|účtovn|finance/i.test(normalized)
  const hasLink = /(?:https?:\/\/|www\.)[^\s<>()]+/i.test(text)
  const hasCredentials = /\b(heslo|password|prihl[aá]s(?:enie|iť)?|login|over(?:iť|enie)|verification|otp|2fa|bezpečnostn[ýá] k[oó]d|card|cvv)\b/i.test(normalized)
  const hasImpersonatedBrand = /\b(banka|bank|slovensk[áy] pošta|packeta|dhl|ups|gls|dpd|finančn[áy] správa|pol[ií]cia|microsoft|google|apple|facebook|instagram|netflix|telekom|orange|o2)\b/i.test(normalized)
  const hasDeliveryOrAccountPretext = /\b(zásielk|bal[ií]k|doručen|účet.{0,20}(blok|over|aktiv)|platobn[áy] karta|neúspešn[áy] platb|obnov.{0,20}(účet|platb))\b/i.test(normalized)
  const score = (hasIban ? 3 : 0) + (hasPayment ? 2 : 0) + (hasChange ? 4 : 0) + (hasUrgency ? 2 : 0) + (hasAuthority ? 1 : 0)

  const reasons = [...analysis.reasons]
  const addReason = (reason: string) => {
    if (!reasons.some((current) => current.toLowerCase() === reason.toLowerCase())) reasons.unshift(reason)
  }

  if (hasLink && hasCredentials) {
    addReason('Správa obsahuje odkaz spolu s výzvou na prihlásenie alebo overenie údajov; ide o typický phishingový vzorec.')
  } else if (hasLink && (hasImpersonatedBrand || hasDeliveryOrAccountPretext)) {
    addReason('Správa kombinuje odkaz so známou značkou alebo výzvou k doručeniu či účtu; identitu a doménu treba overiť mimo správy.')
  } else if (hasLink) {
    addReason('Správa obsahuje odkaz. Bez overenia cieľovej domény ju nemožno označiť za bezpečnú.')
  }

  if (hasChange && hasIban) {
    addReason('Správa obsahuje zmenu IBANu alebo bankových údajov. Tento typ požiadavky sa nesmie potvrdiť iba cez e-mail.')
  } else if (hasPayment) {
    addReason('Správa pracuje s platbou alebo faktúrou; pred úhradou treba overiť príjemcu nezávislým kanálom.')
  }

  if (hasUrgency) addReason('Časový tlak v správe zvyšuje riziko, že ide o pokus obísť bežné overenie.')

  const highRiskPaymentChange = hasChange && (hasIban || hasPayment || hasUrgency)
  const highRiskPhishing = hasLink && hasCredentials && (hasUrgency || hasImpersonatedBrand || hasDeliveryOrAccountPretext)
  const mediumRiskContent = hasLink || hasCredentials || hasDeliveryOrAccountPretext || score >= 4

  if (!mediumRiskContent) return analysis

  const riskLevel = highRiskPaymentChange || highRiskPhishing
    ? 'high'
    : maxRisk(analysis.riskLevel, 'medium')

  return {
    riskLevel,
    reasons: reasons.slice(0, 8),
    recommendation: highRiskPaymentChange
      ? 'Zastavte platbu. Nový IBAN ani príjemcu nepotvrdzujte odpoveďou na tento e-mail. Zavolajte dodávateľovi na kontakt uložený pred touto správou a porovnajte údaje s poslednou schválenou faktúrou.'
      : highRiskPhishing
        ? 'Na odkaz neklikajte a nezadávajte heslo, kód ani údaje o karte. Službu otvorte ručne cez jej známu oficiálnu aplikáciu alebo web.'
        : 'Neotvárajte odkaz priamo zo správy. Ak sa e-mail týka účtu, zásielky alebo platby, overte ho cez oficiálnu aplikáciu alebo známu adresu služby.',
  }
}
