import type { RiskLevel } from '@/lib/types'

export interface UrlThreatSnapshot {
  riskLevel: RiskLevel
  redirectedToUnrelatedDomain?: boolean
  redirectedToHomepage?: boolean
  hasAggressiveTrackingPattern?: boolean
  hasLeadGenForm?: boolean
  hasFinanceLanguage?: boolean
  hasPublicFigureLanguage?: boolean
  hasPasswordField?: boolean
  hasCreditCard?: boolean
  hasLoginForm?: boolean
  hasLocaleMismatch?: boolean
}

const RISK_COPY: Record<RiskLevel, { title: string; summary: string }> = {
  low: {
    title: 'Skôr bezpečný obsah',
    summary: 'Systém nenašiel silné znaky podvodu, ale stále odporúča základnú opatrnosť pred kliknutím alebo odpoveďou.',
  },
  medium: {
    title: 'Obsah vyžaduje overenie',
    summary: 'Objavili sa varovné signály, ktoré môžu súvisieť s manipuláciou, podvrhom identity alebo nátlakom na rýchlu reakciu.',
  },
  high: {
    title: 'Vysoké riziko podvodu',
    summary: 'Výstup obsahuje viacero znakov typických pre phishing, finančný podvod alebo získavanie citlivých údajov.',
  },
}

const DEFAULT_ACTIONS: Record<RiskLevel, string[]> = {
  low: [
    'Pred kliknutím si ešte raz overte odosielateľa alebo doménu.',
    'Nezadávajte citlivé údaje, ak si nie ste úplne istý pôvodom správy.',
    'Ak ide o platbu alebo prístup, potvrďte si požiadavku cez oficiálny kanál.',
  ],
  medium: [
    'Neodpovedajte a nič nepotvrdzujte, kým si správu neoveríte cez známy kontakt.',
    'Skontrolujte doménu, meno odosielateľa a prípadné zmeny v platobných údajoch.',
    'Ak správa tlačí na čas alebo žiada prístup, považujte ju za podozrivú, kým ju niekto nepotvrdí.',
  ],
  high: [
    'Neklikajte na odkazy, nesťahujte prílohy a neposielajte žiadne údaje ani peniaze.',
    'Overte požiadavku mimo tejto správy, ideálne telefonicky cez oficiálny kontakt.',
    'Ak ste už reagovali, okamžite zmeňte heslo a kontaktujte banku alebo IT podporu.',
  ],
}

const DEFAULT_AVOID: Record<RiskLevel, string[]> = {
  low: [
    'Nevypĺňajte citlivé údaje len preto, že správa pôsobí dôveryhodne.',
    'Neberte nízke riziko ako garanciu, že obsah je úplne bezpečný.',
  ],
  medium: [
    'Nepotvrdzujte platbu, prístup ani identitu priamo cez túto správu.',
    'Neklikajte na odkaz len preto, že správa pôsobí urgentne alebo autoritatívne.',
    'Neignorujte zmenu účtu, hesla alebo kontaktných údajov bez druhého overenia.',
  ],
  high: [
    'Neklikajte na odkazy a nesťahujte prílohy z tejto správy.',
    'Neposielajte peniaze, autorizačné kódy ani prihlasovacie údaje.',
    'Neodpovedajte útočníkovi, ak sa vydáva za banku, kolegu alebo dodávateľa.',
  ],
}

const DEFAULT_VERIFY: Record<RiskLevel, string[]> = {
  low: [
    'Overte si odosielateľa alebo doménu na oficiálnom webe.',
    'Ak ide o účet alebo platbu, potvrďte si požiadavku cez známy kontakt.',
  ],
  medium: [
    'Zavolajte na oficiálne číslo firmy alebo banky, nie na číslo v správe.',
    'Porovnajte doménu, reply-to adresu a podpis s predchádzajúcou legitímnou komunikáciou.',
    'Ak ide o firemný kontext, potvrďte si požiadavku s kolegom alebo manažérom mimo e-mailu.',
  ],
  high: [
    'Použite iba oficiálny kontakt z webu firmy, banky alebo internej smernice.',
    'Ak ste už reagovali, okamžite kontaktujte banku alebo IT podporu a zmeňte heslo.',
    'Ak ide o firemnú platbu, zastavte ju a eskalujte incident interne ešte pred ďalším krokom.',
  ],
}

export function getRiskPresentation(level: RiskLevel) {
  return RISK_COPY[level]
}

export function getRiskScore(level: RiskLevel, reasonCount: number) {
  const base = level === 'high' ? 88 : level === 'medium' ? 63 : 24
  return Math.min(98, base + Math.min(reasonCount, 4) * 3)
}

export function getActionSteps(recommendation: string, level: RiskLevel) {
  const normalized = recommendation
    .replace(/^odporúčanie\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  const recommendationSteps = normalized
    .split(/(?:\.\s+|;\s+|\n+)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 8)

  const merged = [...recommendationSteps, ...DEFAULT_ACTIONS[level]]

  return merged.filter((step, index) => merged.findIndex((candidate) => candidate.toLowerCase() === step.toLowerCase()) === index).slice(0, 4)
}

export function getAvoidSteps(level: RiskLevel) {
  return DEFAULT_AVOID[level]
}

export function getVerificationSteps(level: RiskLevel, hostname?: string) {
  const withSource = hostname
    ? [`Overte si doménu alebo zdroj ${hostname} mimo pôvodnej správy alebo reklamy.`]
    : []

  const merged = [...withSource, ...DEFAULT_VERIFY[level]]
  return merged.filter((step, index) => merged.findIndex((candidate) => candidate.toLowerCase() === step.toLowerCase()) === index).slice(0, 4)
}

export function getUrlThreatPosture(snapshot: UrlThreatSnapshot) {
  const isCredentialRisk = Boolean(snapshot.hasPasswordField || snapshot.hasCreditCard || snapshot.hasLoginForm)
  const isInvestmentFunnel = Boolean(
    snapshot.hasFinanceLanguage &&
    snapshot.hasLeadGenForm &&
    (snapshot.hasAggressiveTrackingPattern || snapshot.redirectedToUnrelatedDomain || snapshot.hasPublicFigureLanguage)
  )
  const isMaskedRedirect = Boolean(
    snapshot.redirectedToUnrelatedDomain &&
    (snapshot.hasAggressiveTrackingPattern || snapshot.redirectedToHomepage || snapshot.hasLocaleMismatch)
  )

  if (isCredentialRisk && (snapshot.redirectedToUnrelatedDomain || snapshot.hasAggressiveTrackingPattern || snapshot.riskLevel === 'high')) {
    return {
      tone: 'high' as const,
      label: 'Pravdepodobný phishing alebo zber údajov',
      summary: 'Link vedie na stránku, ktorá môže zbierať prihlasovacie alebo platobné údaje. Nezadávajte nič a overte si cieľ mimo pôvodného odkazu.',
      actions: ['Neprihlasovať sa', 'Nezadávať kartu ani heslo', 'Overiť službu cez oficiálny web'],
    }
  }

  if (isInvestmentFunnel) {
    return {
      tone: 'high' as const,
      label: 'Pravdepodobný scam / investičný funnel',
      summary: 'Reklamný tracking, redirect a zber kontaktov spolu s finančnou ponukou silno pripomínajú podvodný investičný alebo leadgen funnel.',
      actions: ['Nezadávať kontakt', 'Neinvestovať ani neregistrovať sa', 'Nahlásiť reklamu alebo stránku'],
    }
  }

  if (isMaskedRedirect || snapshot.riskLevel === 'high') {
    return {
      tone: 'high' as const,
      label: 'Maskovaný alebo vysoko rizikový link',
      summary: 'Cieľ odkazu nepôsobí dôveryhodne a medzi reklamou, doménou a finálnou stránkou je priveľa nesúladu na bezpečné pokračovanie.',
      actions: ['Neotvárať ďalšie kroky', 'Overiť firmu mimo reklamy', 'Poslať na interné preverenie'],
    }
  }

  if (snapshot.riskLevel === 'medium') {
    return {
      tone: 'medium' as const,
      label: 'Link vyžaduje manuálne overenie',
      summary: 'Na bezpečné pokračovanie nestačí samotná stránka. Pred klikom alebo registráciou si overte doménu, firmu a účel odkazu mimo pôvodnej správy.',
      actions: ['Skontrolovať firmu', 'Porovnať doménu a značku', 'Nepokračovať pod tlakom'],
    }
  }

  return {
    tone: 'low' as const,
    label: 'Nenašli sa silné znaky scam funnelu',
    summary: 'Systém nenašiel kombináciu signálov typickú pre phishing alebo investičný funnel, ale pri linkoch stále platí základná opatrnosť.',
    actions: ['Skontrolovať doménu', 'Nevypĺňať údaje bez dôvodu', 'Pokračovať opatrne'],
  }
}
