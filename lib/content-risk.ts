import type { AnalysisResult, RiskLevel } from '@/lib/types'

type Signal = {
  key: string
  weight: number
  reason: string
}

const LINK = /(?:https?:\/\/|www\.)[^\s<>()]+/i
const URGENCY = /\b(urgent|urgentne|okamžite|hneď|ihneď|dnes|do konca dňa|posledn[áa] šanca|final notice|limited time)\b/i
const CREDENTIALS = /\b(heslo|password|prihl[aá]s(?:enie|iť)?|login|over(?:iť|enie)|verification|otp|2fa|bezpečnostn[ýá] k[oó]d|cvv|card number)\b/i
const PAYMENT = /\b(iban|č[ií]slo účtu|platba|prevod|uhrad(?:iť|te|enie)?|zaplať(?:te|iť)?|poplatok|faktúr[ay]|invoice|bank transfer|beneficiary|kryptopeňaženka|wallet)\b/i
const PAYMENT_CHANGE_FIRST = /\b(zme(?:n|ň)\S*|nov[ýá]|aktualizovan[ýá]|updated|chang(?:e|ed|ing))\b.{0,80}\b(iban|účet|account|bankov[ée]? údaj|beneficiary|platobn)/i
const PAYMENT_CHANGE_SECOND = /\b(iban|účet|account|beneficiary|bankov[ée]? údaj)\b.{0,80}\b(zme(?:n|ň)\S*|nov[ýá]|aktualizovan[ýá]|updated|change)\b/i
const BRAND = /\b(banka|bank|slovensk[áy] pošta|packeta|z[aá]sielkovňa|dhl|ups|gls|dpd|finančn[áy] správa|pol[ií]cia|microsoft|google|apple|facebook|instagram|netflix|telekom|orange|o2)\b/i
const DELIVERY_OR_ACCOUNT = /\b(zásielk[ay]|bal[ií]k|doručen(?:ie|ia)|účet.{0,20}(blok|over|aktiv)|platobn[áy] karta|neúspešn[áy] platb|obnov.{0,20}(účet|platb))\b/i
const INVESTMENT = /\b(invest(?:ovať|ícia|ment)?|crypto|bitcoin|kryptomen|garantovan[ýé]|zaručen[ýé].{0,40}(zisk|výnos)|zdvojnásob|rýchl[ey] zisk)\b/i
const PUBLIC_FIGURE = /\b(prezident|premi[eé]r|minister|politik|celebrity|známa osobnosť|public figure)\b/i
const GIFT_CARD = /\b(darčekov[áy] karta|gift card|steam|itunes|google play)\b/i
const MONEY_REQUEST = /(?:\b(po[šs]li|poslať|preveď|uhrad(?:iť|te)?|zaplať|plaťte)\b.{0,80}\b(€|eur|peniaze|na účet|iban|kartu|platbu)|\b(€|eur|peniaze|na účet|iban|kartu|platbu)\b.{0,80}\b(po[šs]li|poslať|preveď|uhrad(?:iť|te)?|zaplať|plaťte)\b)/i
const NEW_NUMBER_IMPERSONATION = /\b(nov[ée] číslo|nov[ýá] telefón|stratil.{0,20}(telefón|mobil)|toto je moje nové číslo|mama|otec)\b/i
const INTRODUCED_IDENTITY = /\b(?:(?:tu je|som z|sme z|v mene|za spoločnosť|z firmy|this is|from|on behalf of)\s+|(?:invoice update|invoice from|faktúra od)\s*[-:]\s*)([^\n,.!?]{2,60})/i

function has(pattern: RegExp, text: string) {
  return pattern.test(text)
}

/**
 * Explainable content classifier. It intentionally does not treat a link,
 * company name or an e-mail without headers as evidence of fraud on its own.
 */
export function analyzeContentRisk(text: string): AnalysisResult {
  const normalized = text.toLowerCase()
  const hasLink = has(LINK, text)
  const hasUrgency = has(URGENCY, normalized)
  const hasCredentials = has(CREDENTIALS, normalized)
  const hasPayment = has(PAYMENT, normalized)
  const hasPaymentChange = has(PAYMENT_CHANGE_FIRST, normalized) || has(PAYMENT_CHANGE_SECOND, normalized)
  const hasBrand = has(BRAND, normalized)
  const hasDeliveryOrAccount = has(DELIVERY_OR_ACCOUNT, normalized)
  const hasInvestment = has(INVESTMENT, normalized)
  const hasPublicFigure = has(PUBLIC_FIGURE, normalized)
  const hasGiftCard = has(GIFT_CARD, normalized)
  const hasMoneyRequest = has(MONEY_REQUEST, normalized)
  const hasNewNumberImpersonation = has(NEW_NUMBER_IMPERSONATION, normalized)
  const introducedIdentity = text.match(INTRODUCED_IDENTITY)?.[1]?.trim()
  const claimedBrand = text.match(BRAND)?.[0]?.trim()
  const claimedEntity = introducedIdentity || claimedBrand

  const claimedIdentity = claimedEntity
    ? `Komunikácia tvrdí alebo naznačuje, že pochádza od „${claimedEntity}“. Zo samotného obsahu sa to nedá potvrdiť.`
    : hasNewNumberImpersonation
      ? 'Odosielateľ sa môže vydávať za blízku osobu komunikujúcu z nového čísla.'
      : 'Zo zadaného obsahu sa nedá jednoznačne určiť, za koho sa odosielateľ vydáva.'

  const requestedAction = hasPaymentChange
    ? 'Zmeniť bankové údaje alebo príjemcu platby.'
    : hasMoneyRequest || hasPayment
      ? 'Uhradiť platbu, poslať peniaze alebo pracovať s bankovými údajmi.'
      : hasCredentials
        ? 'Prihlásiť sa, potvrdiť účet alebo odovzdať prístupové údaje.'
        : hasLink
          ? 'Otvoriť odkaz a pokračovať na cieľovej stránke.'
          : 'Požadovaná akcia sa zo zadaného obsahu nedá jednoznačne určiť.'

  const identityConsistency = claimedEntity
    ? 'Názov organizácie v texte nie je dôkazom identity. Na potvrdenie treba porovnať odosielateľa alebo doménu s oficiálnym kanálom.'
    : 'Chýba nezávislý údaj, podľa ktorého by sa dala potvrdiť identita odosielateľa.'

  const structuredReasons = [
    `[IDENTITY] ${claimedIdentity}`,
    `[REQUEST] ${requestedAction}`,
    `[CONSISTENCY] ${identityConsistency}`,
    ...(hasUrgency ? ['[SOCIAL] Komunikácia vytvára časový tlak alebo naliehavosť.'] : []),
    ...(hasNewNumberImpersonation ? ['[SOCIAL] Zmena kontaktného čísla oslabuje možnosť potvrdiť známu identitu.'] : []),
    ...(hasLink ? ['[TECHNICAL] Obsahuje odkaz, ktorého doménu treba posúdiť oddelene od textu správy.'] : []),
  ]

  const signals: Signal[] = []
  const add = (active: boolean, signal: Signal) => { if (active) signals.push(signal) }

  add(hasPaymentChange && hasPayment, {
    key: 'payment-change', weight: 6,
    reason: 'Obsah žiada zmenu bankových údajov alebo príjemcu platby. To treba vždy potvrdiť nezávislým kontaktom.',
  })
  add(hasLink && hasCredentials, {
    key: 'credential-link', weight: 5,
    reason: 'Obsah kombinuje odkaz s požiadavkou na prihlásenie, kód alebo citlivé údaje.',
  })
  add(hasLink && hasDeliveryOrAccount, {
    key: 'delivery-link', weight: 3,
    reason: 'Odkaz je spojený so zásielkou, blokovaným účtom alebo platobnou kartou — častou zámienkou phishingu.',
  })
  add(hasInvestment && hasPublicFigure, {
    key: 'investment-figure', weight: 5,
    reason: 'Ponuka spája investíciu alebo zisk s verejnou osobou či autoritou.',
  })
  add(hasInvestment && (hasUrgency || hasLink), {
    key: 'investment-pressure', weight: 3,
    reason: 'Investičná ponuka používa odkaz alebo časový tlak; pred akoukoľvek platbou treba overiť poskytovateľa.',
  })
  add(hasGiftCard && hasUrgency, {
    key: 'gift-card', weight: 5,
    reason: 'Požiadavka na darčekovú kartu pod časovým tlakom je bežný vzorec podvodu.',
  })
  add(hasMoneyRequest && hasUrgency, {
    key: 'money-pressure', weight: 4,
    reason: 'Správa žiada poslať peniaze alebo zaplatiť pod časovým tlakom. Požiadavku si potvrďte iným kontaktom.',
  })
  add(hasNewNumberImpersonation && hasMoneyRequest, {
    key: 'new-number-money', weight: 5,
    reason: 'Správa sa môže vydávať za blízku osobu s novým číslom a zároveň žiada peniaze. Volajte na pôvodné známe číslo.',
  })
  add(hasUrgency && (hasPayment || hasCredentials), {
    key: 'pressure-sensitive', weight: 2,
    reason: 'Správa tlačí na rýchlu reakciu pri platbe alebo citlivých údajoch.',
  })
  add(hasBrand && hasLink && (hasCredentials || hasDeliveryOrAccount), {
    key: 'brand-pretext', weight: 2,
    reason: 'Známu značku alebo inštitúciu spája s odkazom a citlivou požiadavkou.',
  })

  const score = signals.reduce((sum, signal) => sum + signal.weight, 0)
  const high = hasPaymentChange && hasPayment || (hasLink && hasCredentials && (hasUrgency || hasBrand || hasDeliveryOrAccount)) || (hasLink && hasDeliveryOrAccount && hasPayment && hasUrgency) || (hasNewNumberImpersonation && hasMoneyRequest) || score >= 7
  const medium = !high && (score >= 3 || (hasCredentials && hasUrgency) || (hasPayment && hasUrgency) || hasMoneyRequest)
  const riskLevel: RiskLevel = high ? 'high' : medium ? 'medium' : 'low'

  if (riskLevel === 'low') {
    return {
      riskLevel,
      reasons: [
        ...structuredReasons,
        'Nenašla sa kombinácia konkrétnych signálov typická pre phishing, podvodnú platbu alebo nátlak.',
        ...(hasLink ? ['Odkaz bol rozpoznaný, ale samotná prítomnosť odkazu nie je dôkaz podvodu.'] : []),
        ...(hasBrand ? ['Názov značky alebo inštitúcie sa v texte objavuje, no bez ďalších rizikových znakov.'] : []),
      ],
      recommendation: hasPayment || hasCredentials || hasLink
        ? 'Z obsahu sa nedá potvrdiť identita odosielateľa ani bezpečnosť odkazu. Pred citlivým krokom si overte konkrétnu požiadavku nezávislým kanálom.'
        : 'Zadaný obsah neobsahuje citlivú ani neobvyklú požiadavku. Ak sa kontext nezmení, nie je potrebný ďalší krok.',
    }
  }

  return {
    riskLevel,
    reasons: [
      ...structuredReasons,
      ...signals.map((signal) => signal.reason).slice(0, 5),
    ],
    recommendation: hasPaymentChange
      ? 'Platbu neposielajte a zmenu IBAN nepotvrdzujte. Zavolajte dodávateľovi na predtým overené číslo.'
      : hasNewNumberImpersonation && hasMoneyRequest
        ? 'Peniaze neposielajte. Zavolajte blízkej osobe na jej pôvodné známe číslo.'
        : hasCredentials
          ? 'Cez tento odkaz sa neprihlasujte ani neposielajte kód. Otvorte službu priamo cez známu aplikáciu alebo oficiálnu adresu.'
          : hasMoneyRequest || hasPayment
            ? 'Platbu zatiaľ neposielajte. Požiadavku potvrďte cez kontakt, ktorý ste použili už pred touto komunikáciou.'
            : riskLevel === 'high'
              ? 'Podľa tejto požiadavky nekonajte. Identitu odosielateľa potvrďte mimo pôvodnej komunikácie.'
              : 'Pred ďalším krokom si potvrďte odosielateľa a požiadavku cez nezávislý oficiálny kontakt.',
  }
}
