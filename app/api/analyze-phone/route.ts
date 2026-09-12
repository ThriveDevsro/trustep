import { NextRequest, NextResponse } from 'next/server'
import { enforceAnalysisRateLimit } from '@/lib/rate-limit'
import { analyzeForFraudResilient } from '@/lib/ai'
import { createServiceClient } from '@/lib/supabase'
import { getRequestAppUser } from '@/lib/server-auth'

type LookupData = {
  nationalFormat?: string
  countryCode?: string
  countryName?: string
  carrier?: string
  lineType?: string
  callerName?: string
}

type ReputationData = {
  status: 'safe' | 'suspicious' | 'dangerous' | 'unknown'
  score?: number
  reports?: number
  source?: string
}

type BusinessIdentity = {
  name: string
  address?: string
  mapsUrl?: string
}

async function lookupFeelsOddReports(phone: string) {
  const supabase = createServiceClient()
  if (!supabase) return 0
  const { count } = await supabase.from('phone_reports').select('id', { count: 'exact', head: true }).eq('phone_e164', phone)
  return count ?? 0
}

function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '')
  const withPrefix = compact.startsWith('00') ? `+${compact.slice(2)}` : compact
  return /^\+[1-9]\d{6,14}$/.test(withPrefix) ? withPrefix : null
}

// Twilio Lookup can return carrier/line type globally. Caller-name data is only
// available where Twilio (and the relevant public directory) supports it.
async function lookupWithTwilio(phone: string): Promise<LookupData | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return null

  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=line_type_intelligence,caller_name`
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  })
  if (!response.ok) return null

  const data = await response.json() as {
    national_format?: string
    country_code?: string
    caller_name?: { caller_name?: string | null }
    line_type_intelligence?: { carrier_name?: string | null, type?: string | null }
  }
  return {
    nationalFormat: data.national_format,
    countryCode: data.country_code,
    callerName: data.caller_name?.caller_name ?? undefined,
    carrier: data.line_type_intelligence?.carrier_name ?? undefined,
    lineType: data.line_type_intelligence?.type ?? undefined,
  }
}

// A reputation database is intentionally a separate integration from Twilio.
// Configure PHONE_REPUTATION_API_URL (use {phone} in the URL or it is sent as
// ?phone=) and optionally PHONE_REPUTATION_API_TOKEN. The service should return
// { status: 'safe'|'suspicious'|'dangerous'|'unknown', score?, reports?, source? }.
async function lookupReputation(phone: string): Promise<ReputationData | null> {
  const endpoint = process.env.PHONE_REPUTATION_API_URL
  if (!endpoint) return null

  const url = endpoint.includes('{phone}')
    ? endpoint.replace('{phone}', encodeURIComponent(phone))
    : `${endpoint}${endpoint.includes('?') ? '&' : '?'}phone=${encodeURIComponent(phone)}`
  const token = process.env.PHONE_REPUTATION_API_TOKEN
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  })
  if (!response.ok) return null

  const data = await response.json() as Partial<ReputationData>
  const status = data.status
  if (status !== 'safe' && status !== 'suspicious' && status !== 'dangerous' && status !== 'unknown') return null
  return { status, score: data.score, reports: data.reports, source: data.source }
}

// Google Places supports phone-number searches for public businesses. It is the
// identity source; it is not used as a fraud/reputation signal.
async function lookupBusinessIdentity(phone: string): Promise<BusinessIdentity | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: phone,
      ...(phone.startsWith('+421') ? { regionCode: 'SK' } : {}),
      languageCode: 'sk',
      maxResultCount: 1,
    }),
    cache: 'no-store',
  })
  if (!response.ok) return null

  const data = await response.json() as {
    places?: Array<{
      displayName?: { text?: string }
      formattedAddress?: string
      googleMapsUri?: string
    }>
  }
  const place = data.places?.[0]
  const name = place?.displayName?.text?.trim()
  return name ? { name, address: place?.formattedAddress, mapsUrl: place?.googleMapsUri } : null
}

export async function POST(req: NextRequest) {
  const rateLimited = enforceAnalysisRateLimit(req, 'analyze-phone')
  if (rateLimited) return rateLimited

  if (!(await getRequestAppUser(req))) {
    return NextResponse.json({ error: 'Pre overenie sa prihláste alebo si vytvorte firemný účet.' }, { status: 401 })
  }

  try {
    const { phone, context } = await req.json() as { phone?: string; context?: string }
    const normalized = normalizePhone(phone ?? '')
    if (!normalized) {
      return NextResponse.json({ error: 'Zadajte číslo v medzinárodnom formáte, napr. +421 9xx xxx xxx.' }, { status: 400 })
    }

    const callContext = typeof context === 'string' ? context.trim().slice(0, 4000) : ''
    const [lookup, reputation, business, contextAnalysis, trustStepReports] = await Promise.all([
      lookupWithTwilio(normalized),
      lookupReputation(normalized),
      lookupBusinessIdentity(normalized),
      callContext ? analyzeForFraudResilient(`Popis telefonátu na preverenie podvodu:\n\n${callContext}`) : Promise.resolve(null),
      lookupFeelsOddReports(normalized),
    ])
    const name = business?.name ?? lookup?.callerName?.trim()
    const reputationRisk = reputation?.status === 'dangerous'
      ? 'high'
      : reputation?.status === 'suspicious'
        ? 'medium'
        : reputation?.status === 'safe'
          ? 'low'
          : 'medium'
    const internalRisk = trustStepReports >= 3 ? 'high' : trustStepReports > 0 ? 'medium' : 'low'
    const riskLevel = contextAnalysis?.riskLevel === 'high' || reputationRisk === 'high' || internalRisk === 'high'
      ? 'high'
      : contextAnalysis?.riskLevel === 'medium' || reputationRisk === 'medium' || internalRisk === 'medium'
        ? 'medium'
        : 'low'
    const reasons = [
      `Číslo je v platnom medzinárodnom formáte (${normalized}).`,
      ...(lookup?.countryCode ? [`Krajina čísla: ${lookup.countryCode}.`] : []),
      ...(lookup?.lineType ? [`Typ linky podľa poskytovateľa: ${lookup.lineType}.`] : []),
      ...(lookup?.carrier ? [`Operátor: ${lookup.carrier}.`] : []),
      reputation?.status === 'dangerous'
        ? `Reputačný zdroj označuje číslo ako nebezpečné${reputation.reports ? ` (${reputation.reports} hlásení)` : ''}.`
        : reputation?.status === 'suspicious'
          ? `Reputačný zdroj eviduje pri čísle podozrivé správanie${reputation.reports ? ` (${reputation.reports} hlásení)` : ''}.`
          : reputation?.status === 'safe'
            ? 'Reputačný zdroj nemá pri čísle evidované závažné riziko.'
            : 'Reputačná databáza nie je pripojená alebo pre číslo nemá záznam — nejde o verdikt bezpečnosti.',
      name
        ? ['Názov bol nájdený vo verejne dostupnom identifikačnom zdroji.']
        : ['Verejné meno firmy sa pre toto číslo nepodarilo potvrdiť.'],
      ...(contextAnalysis ? contextAnalysis.reasons.map((reason) => `Obsah hovoru: ${reason}`) : []),
      ...(trustStepReports > 0 ? [`Komunita FeelsOdd eviduje pri čísle ${trustStepReports} ${trustStepReports === 1 ? 'hlásenie' : 'hlásení'}; ide o signál na dodatočné overenie, nie samostatný dôkaz podvodu.`] : []),
    ]

    return NextResponse.json({
      phone: normalized,
      formattedPhone: lookup?.nationalFormat ?? normalized,
      manualLookupUrl: `https://www.vyhladavaniecisla.sk/cislo/${normalized.replace(/\D/g, '')}`,
      companyName: name ?? null,
      businessAddress: business?.address ?? null,
      businessMapsUrl: business?.mapsUrl ?? null,
      identitySource: business ? 'Google Maps' : lookup?.callerName ? 'Twilio Lookup' : null,
      countryCode: lookup?.countryCode ?? null,
      carrier: lookup?.carrier ?? null,
      lineType: lookup?.lineType ?? null,
      lookupAvailable: Boolean(lookup || process.env.GOOGLE_MAPS_API_KEY),
      reputationStatus: reputation?.status ?? 'unknown',
      reputationScore: reputation?.score ?? null,
      reputationReports: reputation?.reports ?? null,
      reputationSource: reputation?.source ?? null,
      trustStepReports,
      riskLevel,
      reasons,
      recommendation: contextAnalysis?.recommendation ?? (name
        ? 'Meno berte ako orientačnú pomôcku. Ak volajúci žiada údaje alebo platbu, zavolajte firme späť cez kontakt na jej oficiálnej stránke.'
        : 'Bez pripojenej reputačnej databázy nie je možné číslo vyhlásiť za bezpečné. Pri žiadosti o údaje či platbu volajúceho overte cez oficiálny kontakt firmy.'),
    })
  } catch (error) {
    console.error('[analyze-phone]', error)
    return NextResponse.json({ error: 'Telefónne číslo sa nepodarilo overiť.' }, { status: 500 })
  }
}
