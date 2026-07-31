'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Copy, ExternalLink, Globe, Loader2, Search, ShieldAlert, ShieldCheck, Split } from 'lucide-react'
import { AnalysisInsights } from '@/components/AnalysisInsights'
import { getCurrentAppUser } from '@/lib/app-auth'
import { getUrlThreatPosture } from '@/lib/analysis-presentation'

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

interface UrlCheckResponse {
  id: string | null
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
  recommendation: string
  hostname?: string
  title?: string
  originalHostname?: string
  finalHostname?: string
  redirectedOffDomain?: boolean
  redirectedToUnrelatedDomain?: boolean
  redirectedToHomepage?: boolean
  hasTemplateTrackingPlaceholders?: boolean
  hasAdPlatformMarkers?: boolean
  opaqueTrackingParams?: number
  hasFinanceLanguage?: boolean
  hasPublicFigureLanguage?: boolean
  hasLeadGenForm?: boolean
  hasAggressiveTrackingPattern?: boolean
  hasLocaleMismatch?: boolean
  pageLang?: string
  hasPasswordField?: boolean
  hasCreditCard?: boolean
  hasLoginForm?: boolean
  heuristicScore?: number
  fetchError?: string
  error?: string
}

export default function LinkCheckPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UrlCheckResponse | null>(null)
  const [copied, setCopied] = useState<'domain' | 'summary' | ''>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentAppUser()
      setIsLoggedIn(Boolean(user))
      if (user?.email) {
        setSubmittedBy(user.email)
      } else {
        const next = `${window.location.pathname}${window.location.search}`
        router.replace(`/login?next=${encodeURIComponent(next)}`)
      }
      setAuthChecked(true)
    }

    loadUser()
  }, [router])

  async function copyText(value: string, kind: 'domain' | 'summary') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(''), 1800)
    } catch {
      setCopied('')
    }
  }

  async function ensureUserPrefill() {
    const user = await getCurrentAppUser()
    return {
      companyId: user?.id || DEMO_COMPANY_ID,
      submittedBy: submittedBy.trim() || user?.email || '',
      isLoggedIn: Boolean(user),
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const userState = await ensureUserPrefill()
      if (!userState.isLoggedIn) {
        throw new Error('Na overovanie sa najprv prihláste.')
      }

      if (!userState.submittedBy) {
        throw new Error('Zadajte e-mail pre výsledok URL kontroly.')
      }

      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          submittedBy: userState.submittedBy,
          companyId: userState.companyId,
        }),
      })

      const payload = await response.json() as UrlCheckResponse
      if (!response.ok) {
        throw new Error(payload.error || 'Nepodarilo sa overiť link.')
      }

      if (payload.id) {
        router.push(`/report/${payload.id}`)
        return
      }

      setResult(payload)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nepodarilo sa overiť link.')
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
      </main>
    )
  }

  const threatPosture = result
    ? getUrlThreatPosture({
        riskLevel: result.riskLevel,
        redirectedToUnrelatedDomain: result.redirectedToUnrelatedDomain,
        redirectedToHomepage: result.redirectedToHomepage,
        hasAggressiveTrackingPattern: result.hasAggressiveTrackingPattern,
        hasLeadGenForm: result.hasLeadGenForm,
        hasFinanceLanguage: result.hasFinanceLanguage,
        hasPublicFigureLanguage: result.hasPublicFigureLanguage,
        hasPasswordField: result.hasPasswordField,
        hasCreditCard: result.hasCreditCard,
        hasLoginForm: result.hasLoginForm,
        hasLocaleMismatch: result.hasLocaleMismatch,
      })
    : null
  const finalDomain = result?.finalHostname || result?.hostname || ''
  const verificationHref = finalDomain ? `https://www.google.com/search?q=${encodeURIComponent(finalDomain)}` : ''
  const shareHref = result
    ? `mailto:?subject=${encodeURIComponent(`TrustStep overenie linku: ${finalDomain || url}`)}&body=${encodeURIComponent(
        [
          `Verdikt: ${threatPosture?.label || result.riskLevel}`,
          `Link: ${url}`,
          finalDomain ? `Finálna doména: ${finalDomain}` : '',
          `Odporúčanie: ${result.recommendation}`,
        ].filter(Boolean).join('\n')
      )}`
    : ''
  const verdictToneClasses = threatPosture?.tone === 'high'
    ? 'border-red-200 bg-red-50 text-red-950'
    : threatPosture?.tone === 'medium'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-emerald-200 bg-emerald-50 text-emerald-950'

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-teal-500 selection:text-white">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-1.5 text-teal-700">
              <Globe className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Link safety check</span>
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Vložte podozrivý odkaz a zistite, kam vás naozaj posiela
            </h1>
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
              TrustStep skontroluje redirecty, finálnu doménu, login a platobné prvky, tracking parametre aj typické scam signály.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Čo kontrolujeme</h2>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                      pôvodnú URL, finálnu doménu, reklamné tracking vzorce, lead formuláre, login a card polia aj investičné a impersonačné signály.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                    <Split className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Čo dostanete</h2>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                      jasný verdict, score breakdown, dôvody, čo spraviť teraz a ako si odkaz overiť bezpečne mimo pôvodnej správy alebo reklamy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Podozrivý link</label>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3.5">
                  <Search className="h-4 w-4 shrink-0 text-teal-700" />
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://podozriva-stranka.sk"
                    className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">E-mail pre výsledok</label>
                <input
                  type="email"
                  value={submittedBy}
                  onChange={(event) => setSubmittedBy(event.target.value)}
                  required
                  disabled
                  placeholder="napr. jan@firma.sk"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <p className="mt-2 text-sm font-medium text-gray-500">Výsledok sa uloží do prihláseného účtu.</p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isLoggedIn}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Overujem stránku...
                  </>
                ) : (
                  <>
                    Overiť stránku
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {result && (
              <div className="mt-8 space-y-4 border-t border-gray-100 pt-8">
                {threatPosture && (
                  <div className={`rounded-3xl border p-5 ${verdictToneClasses}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">Verdikt pre rozhodnutie</div>
                        <div className="mt-2 flex items-center gap-2 text-lg font-extrabold">
                          <ShieldAlert className="h-5 w-5" />
                          {threatPosture.label}
                        </div>
                        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed opacity-90">
                          {threatPosture.summary}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-black">
                        Score {result.heuristicScore ?? 0}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {threatPosture.actions.map((action) => (
                        <span key={action} className="rounded-full border border-current/15 bg-white/70 px-3 py-1.5 text-xs font-bold">
                          {action}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {verificationHref && (
                        <a
                          href={verificationHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                        >
                          Overiť firmu mimo reklamy
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {finalDomain && (
                        <button
                          type="button"
                          onClick={() => copyText(finalDomain, 'domain')}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition-colors hover:bg-slate-50"
                        >
                          <Copy className="h-4 w-4" />
                          {copied === 'domain' ? 'Doména skopírovaná' : 'Skopírovať finálnu doménu'}
                        </button>
                      )}
                      {shareHref && (
                        <a
                          href={shareHref}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition-colors hover:bg-slate-50"
                        >
                          Poslať kolegovi
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => copyText(
                          [
                            `Verdikt: ${threatPosture.label}`,
                            `Link: ${url}`,
                            finalDomain ? `Finálna doména: ${finalDomain}` : '',
                            `Odporúčanie: ${result.recommendation}`,
                          ].filter(Boolean).join('\n'),
                          'summary'
                        )}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition-colors hover:bg-slate-50"
                      >
                        <Copy className="h-4 w-4" />
                        {copied === 'summary' ? 'Zistenia skopírované' : 'Skopírovať zistenia'}
                      </button>
                    </div>
                  </div>
                )}

                <AnalysisInsights
                  riskLevel={result.riskLevel}
                  reasons={result.reasons}
                  recommendation={result.recommendation}
                  hostname={result.hostname}
                  title={result.title}
                />

                <div className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">URL score breakdown</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Pôvodná doména</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{result.originalHostname || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Finálna doména</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{result.finalHostname || result.hostname || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Heuristic score</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{result.heuristicScore ?? 0}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Redirect mimo domény</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{result.redirectedOffDomain ? 'Áno' : 'Nie'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Nesúvisiaca cieľová doména</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{result.redirectedToUnrelatedDomain ? 'Áno' : 'Nie'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Jazyk stránky</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{result.pageLang || '—'}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {result.redirectedToUnrelatedDomain && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        Link po kliknutí nekončí na pôvodnej značke alebo doméne, ale na inom cieli. To je silný signál maskovaného redirectu.
                      </div>
                    )}
                    {result.redirectedToHomepage && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        Reklamný link nekončí na konkrétnej ponuke, ale na generickej homepage.
                      </div>
                    )}
                    {result.hasAggressiveTrackingPattern && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        URL nesie kombináciu reklamných placeholderov, Meta trackingu a hashovaných identifikátorov typickú pre scam alebo affiliate funnel.
                      </div>
                    )}
                    {result.hasTemplateTrackingPlaceholders && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        URL obsahuje reklamné template placeholdery typu campaign/adset.
                      </div>
                    )}
                    {result.hasAdPlatformMarkers && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Detegované boli reklamné tracking znaky platformy Meta/Facebook.
                      </div>
                    )}
                    {(result.opaqueTrackingParams ?? 0) > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        URL obsahuje {result.opaqueTrackingParams} netransparentných tracking parametrov alebo hashovaných identifikátorov.
                      </div>
                    )}
                    {result.hasPasswordField && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Stránka obsahuje pole pre heslo.
                      </div>
                    )}
                    {result.hasCreditCard && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Stránka obsahuje platobné polia.
                      </div>
                    )}
                    {result.hasLoginForm && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Stránka obsahuje prihlasovací formulár.
                      </div>
                    )}
                    {result.hasLeadGenForm && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        Stránka obsahuje kontaktný alebo lead formulár.
                      </div>
                    )}
                    {result.hasLocaleMismatch && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        Región alebo jazyk kampane nesedí s finálnou stránkou, čo znižuje dôveryhodnosť reklamy.
                      </div>
                    )}
                    {result.fetchError && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        {result.fetchError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!result && (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium leading-relaxed text-slate-600">
                Vložte link a TrustStep skontroluje doménu, redirecty, formuláre aj scam vzorce bez nutnosti otvoriť stránku naslepo.
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/submit?tab=url"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Prejsť na plný submit flow
          </Link>
          <Link
            href="/#pilot"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-800"
          >
            Požiadať o pilot
          </Link>
        </div>
      </main>
    </div>
  )
}
