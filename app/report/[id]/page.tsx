import { deriveAccountNameFromEmail } from '@/lib/app-auth'
import { getDevRequestById } from '@/lib/dev-requests-store'
import { createServiceClient } from '@/lib/supabase'
import { AnalysisInsights } from '@/components/AnalysisInsights'
import { SourceBadge } from '@/components/SourceBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { getUrlThreatPosture } from '@/lib/analysis-presentation'
import type { Request } from '@/lib/types'
import { notFound } from 'next/navigation'
import { Clock, User, Calendar, Building2, Hash, ArrowRight, ShieldCheck, Siren, FileText, ExternalLink, Mail, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

type RequestDetail = {
  icon: JSX.Element
  label: string
  value: string | JSX.Element
}

async function getRequest(id: string): Promise<Request | null> {
  const supabase = createServiceClient()

  if (!supabase) {
    return getDevRequestById(id)
  }

  const { data } = await supabase
    .from('requests')
    .select('*, companies(name, approver_email)')
    .eq('id', id)
    .single()

  if (data) {
    return data as Request
  }

  return id.startsWith('devreq-') ? await getDevRequestById(id) : null
}

function extractUrlSignals(text: string) {
  const originalUrl = text.match(/^URL:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const originalDomain = text.match(/^Pôvodná doména:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const finalDomain = text.match(/^Finálna doména:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const heuristicScore = text.match(/^Heuristic skóre:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const redirect = text.match(/^⚠️ Redirect:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const hasPasswordField = text.includes('⚠️ Stránka obsahuje pole pre heslo')
  const hasCardField = text.includes('⚠️ Stránka obsahuje pole pre platobnú kartu')
  const hasLoginForm = text.includes('⚠️ Stránka obsahuje prihlasovací formulár')
  const hasLeadForm = text.includes('⚠️ Stránka obsahuje leadgen/kontaktný formulár')
  const hasTemplateTracking = text.includes('⚠️ URL obsahuje reklamné campaign/adset placeholdery')
  const hasAdTracking = text.includes('⚠️ URL obsahuje reklamné tracking znaky platformy Meta/Facebook')
  const redirectedToUnrelatedDomain = text.includes('⚠️ Redirect smeruje na nesúvisiacu cieľovú doménu')
  const redirectedToHomepage = text.includes('⚠️ Reklamný odkaz končí na generickej homepage')
  const hasAggressiveTracking = text.includes('⚠️ URL nesie kombináciu scam typických reklamných a tracking signálov')
  const hasLocaleMismatch = text.includes('⚠️ Jazyk alebo región kampane nesedí s jazykom finálnej stránky')
  const pageLang = text.match(/^Jazyk stránky:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const opaqueTracking = text.match(/^⚠️ URL obsahuje (\d+) netransparentných tracking parametrov/m)?.[1]?.trim() ?? ''

  if (!originalUrl && !finalDomain && !redirect) return null

  return {
    originalUrl,
    originalDomain,
    finalDomain,
    heuristicScore,
    redirect,
    hasPasswordField,
    hasCardField,
    hasLoginForm,
    hasLeadForm,
    hasTemplateTracking,
    hasAdTracking,
    redirectedToUnrelatedDomain,
    redirectedToHomepage,
    hasAggressiveTracking,
    hasLocaleMismatch,
    pageLang,
    opaqueTracking,
  }
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const request = await getRequest(params.id)
  if (!request) notFound()
  const urlSignals = request.source === 'web' ? extractUrlSignals(request.text) : null

  const formattedDate = new Date(request.created_at).toLocaleString('sk-SK', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const details: RequestDetail[] = [
    { icon: <User className="w-4 h-4" />, label: 'Odosielateľ', value: request.submitted_by },
    { icon: <Building2 className="w-4 h-4" />, label: 'Zdroj', value: <SourceBadge source={request.source} /> },
    { icon: <Calendar className="w-4 h-4" />, label: 'Dátum', value: formattedDate },
    { icon: <Clock className="w-4 h-4" />, label: 'Stav', value: <StatusBadge status={request.status} /> },
    ...(request.phone_from ? [{ icon: <Hash className="w-4 h-4" />, label: 'Telefón', value: request.phone_from }] : []),
    ...(request.companies?.name
      ? [{ icon: <Building2 className="w-4 h-4" />, label: 'Účet', value: request.companies.name }]
      : [{ icon: <Building2 className="w-4 h-4" />, label: 'Účet', value: deriveAccountNameFromEmail(request.submitted_by) }]),
  ]

  const primaryAction = request.risk_level === 'high'
    ? { href: '/inboxes', label: 'Otvoriť inboxy a incidenty', icon: <Siren className="w-4 h-4" /> }
    : { href: '/submit', label: 'Spustiť novú analýzu', icon: <ArrowRight className="w-4 h-4" /> }
  const threatPosture = request.source === 'web' && urlSignals
    ? getUrlThreatPosture({
        riskLevel: request.risk_level,
        redirectedToUnrelatedDomain: urlSignals.redirectedToUnrelatedDomain,
        redirectedToHomepage: urlSignals.redirectedToHomepage,
        hasAggressiveTrackingPattern: urlSignals.hasAggressiveTracking,
        hasLeadGenForm: urlSignals.hasLeadForm,
        hasFinanceLanguage: request.reasons?.some((reason) => /finan|invest/i.test(reason)),
        hasPublicFigureLanguage: request.reasons?.some((reason) => /verejnú osobu|autoritu|polit/i.test(reason)),
        hasPasswordField: urlSignals.hasPasswordField,
        hasCreditCard: urlSignals.hasCardField,
        hasLoginForm: urlSignals.hasLoginForm,
        hasLocaleMismatch: urlSignals.hasLocaleMismatch,
      })
    : null
  const threatToneClasses = threatPosture?.tone === 'high'
    ? 'border-red-200 bg-red-50 text-red-950'
    : threatPosture?.tone === 'medium'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-emerald-200 bg-emerald-50 text-emerald-950'
  const verificationDomain = urlSignals?.finalDomain || urlSignals?.originalDomain || ''
  const verificationHref = verificationDomain ? `https://www.google.com/search?q=${encodeURIComponent(verificationDomain)}` : ''
  const shareHref = `mailto:?subject=${encodeURIComponent(`TrustStep incident: ${verificationDomain || request.source}`)}&body=${encodeURIComponent(
    [
      `Riziko: ${request.risk_level.toUpperCase()}`,
      threatPosture ? `Verdikt: ${threatPosture.label}` : '',
      verificationDomain ? `Doména: ${verificationDomain}` : '',
      `Odporúčanie: ${request.recommendation}`,
    ].filter(Boolean).join('\n')
  )}`

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-teal-500 selection:text-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/dashboard" className="inline-block text-sm font-medium text-slate-500 transition-colors hover:text-slate-800">
              ← Dashboard
            </Link>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-1.5 text-teal-700">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Incident report</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Výsledok bezpečnostného overenia</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Výstup je rozdelený na verdikt, dôvody, odporúčané kroky a bezpečné overenie, aby sa podľa neho dalo rýchlo rozhodnúť.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SourceBadge source={request.source} />
              <StatusBadge status={request.status} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryAction.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-800"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Link>
            <Link
              href="/submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50"
            >
              Pozrieť cenník a pilot
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {threatPosture && (
              <div className={`rounded-3xl border p-6 shadow-sm ${threatToneClasses}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">Verdikt pre rozhodnutie</div>
                    <div className="mt-2 flex items-center gap-2 text-xl font-extrabold">
                      <ShieldAlert className="w-5 h-5" />
                      {threatPosture.label}
                    </div>
                    <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed opacity-90">
                      {threatPosture.summary}
                    </p>
                  </div>
                  {urlSignals?.heuristicScore && (
                    <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-black">
                      Score {urlSignals.heuristicScore}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {threatPosture.actions.map((action) => (
                    <span key={action} className="rounded-full border border-current/15 bg-white/70 px-3 py-1.5 text-xs font-bold">
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <AnalysisInsights
              riskLevel={request.risk_level}
              reasons={request.reasons ?? []}
              recommendation={request.recommendation}
            />

            {urlSignals && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Link a doménové signály</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {urlSignals.originalDomain && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Pôvodná doména</div>
                      <div className="mt-2 break-all text-sm font-semibold text-slate-900">{urlSignals.originalDomain}</div>
                    </div>
                  )}
                  {urlSignals.originalUrl && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Pôvodná URL</div>
                      <div className="mt-2 break-all text-sm font-semibold text-slate-900">{urlSignals.originalUrl}</div>
                    </div>
                  )}
                  {urlSignals.finalDomain && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Finálna doména</div>
                      <div className="mt-2 break-all text-sm font-semibold text-slate-900">{urlSignals.finalDomain}</div>
                    </div>
                  )}
                  {urlSignals.heuristicScore && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">URL score breakdown</div>
                      <div className="mt-2 break-all text-sm font-semibold text-slate-900">{urlSignals.heuristicScore}</div>
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Nesúvisiaca cieľová doména</div>
                    <div className="mt-2 break-all text-sm font-semibold text-slate-900">{urlSignals.redirectedToUnrelatedDomain ? 'Áno' : 'Nie'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Jazyk stránky</div>
                    <div className="mt-2 break-all text-sm font-semibold text-slate-900">{urlSignals.pageLang || '—'}</div>
                  </div>
                </div>

                {(urlSignals.redirect || urlSignals.hasPasswordField || urlSignals.hasCardField || urlSignals.hasLoginForm || urlSignals.hasLeadForm || urlSignals.hasTemplateTracking || urlSignals.hasAdTracking || urlSignals.redirectedToUnrelatedDomain || urlSignals.redirectedToHomepage || urlSignals.hasAggressiveTracking || urlSignals.hasLocaleMismatch || urlSignals.opaqueTracking) && (
                  <div className="mt-4 grid gap-3">
                    {urlSignals.redirect && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                        {urlSignals.redirect}
                      </div>
                    )}
                    {urlSignals.redirectedToUnrelatedDomain && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        Link po kliknutí nekončí na očakávanej značke alebo doméne, ale na inom cieli.
                      </div>
                    )}
                    {urlSignals.redirectedToHomepage && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        Reklamný link končí na generickej homepage namiesto jasnej cieľovej ponuky.
                      </div>
                    )}
                    {urlSignals.hasAggressiveTracking && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        URL nesie kombináciu reklamných placeholderov, trackingu a hashovaných identifikátorov typickú pre scam funnel.
                      </div>
                    )}
                    {urlSignals.hasTemplateTracking && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        URL obsahuje reklamné template placeholdery, čo býva typické pri ad-tech redirectoch a scam kampaniach.
                      </div>
                    )}
                    {urlSignals.hasAdTracking && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        V odkaze sú prítomné reklamné tracking signály, preto je dôležité pozrieť aj na finálnu doménu a redirecty.
                      </div>
                    )}
                    {urlSignals.opaqueTracking && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        URL obsahuje {urlSignals.opaqueTracking} netransparentných tracking parametrov alebo hashovaných identifikátorov.
                      </div>
                    )}
                    {urlSignals.hasPasswordField && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Stránka obsahuje heslové pole, čo zvyšuje riziko phishingu alebo falošného prihlásenia.
                      </div>
                    )}
                    {urlSignals.hasCardField && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Stránka obsahuje platobné polia, preto je potrebné vyššie overenie pred akýmkoľvek zadaním údajov.
                      </div>
                    )}
                    {urlSignals.hasLoginForm && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Detegovali sme prihlasovací formulár, ktorý môže byť legitímny aj podvodný podľa kontextu domény a redirectov.
                      </div>
                    )}
                    {urlSignals.hasLeadForm && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Stránka obsahuje kontaktný alebo lead formulár, čo je častý vzorec pri scam reklamách a falošných investičných funnel-och.
                      </div>
                    )}
                    {urlSignals.hasLocaleMismatch && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        Región alebo jazyk kampane nesedí s jazykom finálnej stránky, čo znižuje dôveryhodnosť odkazu.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                <FileText className="w-4 h-4" />
                Analyzovaný obsah
              </h2>
              <pre className="mt-4 max-h-[30rem] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {request.text}
              </pre>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Detaily incidentu</h2>
              <dl className="mt-5 space-y-4">
                {details.map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 text-slate-400">{icon}</span>
                    <div>
                      <dt className="font-semibold text-slate-500">{label}</dt>
                      <dd className="mt-1 text-slate-900">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Rýchle akcie</h2>
              <div className="mt-4 grid gap-3">
                {verificationHref && (
                  <a
                    href={verificationHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
                  >
                    Overiť firmu mimo reklamy
                    <ExternalLink className="w-4 h-4 text-teal-700" />
                  </a>
                )}
                <a
                  href={shareHref}
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
                >
                  Poslať kolegovi
                  <Mail className="w-4 h-4 text-teal-700" />
                </a>
                <Link
                  href="/submit"
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
                >
                  Spustiť ďalšiu analýzu
                  <ArrowRight className="w-4 h-4 text-teal-700" />
                </Link>
                <Link
                  href="/inboxes"
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
                >
                  Uložiť a riešiť ako incident
                  <ArrowRight className="w-4 h-4 text-teal-700" />
                </Link>
                <Link
                  href="/#pilot"
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
                >
                  Požiadať o pilot alebo rollout
                  <ArrowRight className="w-4 h-4 text-teal-700" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
