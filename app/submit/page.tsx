'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnalysisInsights } from '@/components/AnalysisInsights'
import { getCurrentAppUser } from '@/lib/app-auth'
import { saveLocalRequest } from '@/lib/local-history'
import type { RequestSource } from '@/lib/types'
import { FileUp, Globe, ImageIcon, Loader2, Mail, Phone, Send, X } from 'lucide-react'

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

const INPUT_TYPES = [
  { id: 'email', label: 'Správa / e-mail', icon: Mail },
  { id: 'url', label: 'Link', icon: Globe },
  { id: 'image', label: 'Screenshot', icon: ImageIcon },
  { id: 'call', label: 'Hovor', icon: Phone },
] as const

const COPY = {
  email: {
    title: 'Vložte podozrivú správu, e-mail alebo pokyn.',
    helper: 'Stačí text správy z e-mailu, SMS, chatu alebo interného pokynu. Ak máte exportovaný .eml súbor, môžete ho nahrať ako alternatívu.',
    placeholder: 'Sem vložte text e-mailu, SMS, chatu alebo podozrivého pokynu...',
  },
  sms: {
    title: 'Vložte celú SMS.',
    helper: 'Neklikajte na link. Skopírujte celú správu vrátane odkazu.',
    placeholder: 'Sem vložte text SMS vrátane odkazu...',
  },
  url: {
    title: 'Vložte podozrivý link.',
    helper: 'TrustStep skontroluje doménu, redirecty, formuláre a obsah stránky.',
    placeholder: 'https://podozriva-stranka.sk',
  },
  image: {
    title: 'Nahrajte screenshot.',
    helper: 'Funguje na SMS, chat, e-mail, webstránku alebo reklamu.',
    placeholder: '',
  },
  call: {
    title: 'Nahrajte podozrivý hovor.',
    helper: 'Pre nahrávky hovoru používame samostatnú stránku.',
    placeholder: '',
  },
}

type InputType = keyof typeof COPY

interface InlineResult {
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
  recommendation: string
  hostname?: string
  title?: string
}

interface AnalyzeApiResponse extends InlineResult {
  id: string | null
  error?: string
  extractedText?: string
}

interface ShareDraftPayload {
  id: string
  title?: string
  text?: string
  url?: string
  file?: {
    name: string
    type: string
    dataUrl: string
  }
}

function getLocalSource(type: InputType): RequestSource {
  if (type === 'url') return 'web'
  if (type === 'image') return 'image'
  if (type === 'sms') return 'sms'
  return 'email'
}

function isInputType(value: string): value is InputType {
  return value in COPY
}

export default function SubmitPage() {
  const router = useRouter()
  const [type, setType] = useState<InputType>('email')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')
  const [companyId, setCompanyId] = useState(DEMO_COMPANY_ID)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [inlineResult, setInlineResult] = useState<InlineResult | null>(null)
  const [emailFile, setEmailFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const emailFileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const activeCopy = COPY[type]

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentAppUser()

      if (user) {
        setIsLoggedIn(true)
        setCompanyId(user.id)
        setSubmittedBy(user.email || '')
      } else {
        setIsLoggedIn(false)
        setCompanyId(DEMO_COMPANY_ID)
        const next = `${window.location.pathname}${window.location.search}`
        router.replace(`/login?next=${encodeURIComponent(next)}`)
      }

      setAuthChecked(true)
    }

    loadUser()
  }, [router])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  useEffect(() => {
    async function hydrateSharedDraft() {
      const params = new URLSearchParams(window.location.search)
      const requestedTab = params.get('tab')?.trim() ?? ''
      const sharedUrl = params.get('shared_url')?.trim() ?? ''
      const sharedText = params.get('shared_text')?.trim() ?? ''
      const sharedTitle = params.get('shared_title')?.trim() ?? ''
      const legacyUrl = params.get('url')?.trim() ?? ''
      const legacyText = params.get('text')?.trim() ?? ''
      const shareDraftId = params.get('share_draft')?.trim() ?? ''
      const submittedByPrefill = params.get('submitted_by')?.trim() ?? ''

      if (requestedTab === 'sms') {
        setType('email')
        setNotice('SMS môžete overiť priamo ako text správy.')
      } else if (isInputType(requestedTab)) {
        setType(requestedTab)
      }
      if (submittedByPrefill) setSubmittedBy((current) => current || submittedByPrefill)

      if (shareDraftId) {
        try {
          const response = await fetch(`/api/share-drafts/${shareDraftId}`)
          if (!response.ok) return

          const draft = await response.json() as ShareDraftPayload

          if (draft.url) {
            setType('url')
            setUrl(draft.url)
            setNotice('Zdieľaný odkaz bol predvyplnený.')
            return
          }

          if (draft.file?.dataUrl) {
            const fileResponse = await fetch(draft.file.dataUrl)
            const blob = await fileResponse.blob()
            setType('image')
            setImageFile(new File([blob], draft.file.name || 'shared-image.png', { type: draft.file.type || blob.type }))
            setNotice('Zdieľaný screenshot bol predvyplnený.')
            return
          }

          const combinedText = [draft.title, draft.text].filter(Boolean).join('\n\n').trim()
          if (combinedText) {
            setType('email')
            setText(combinedText)
            setNotice('Zdieľaný text správy bol predvyplnený.')
          }
        } catch (draftError) {
          console.error('[submit-share-draft]', draftError)
        }
        return
      }

      if (sharedUrl || legacyUrl) {
        setType('url')
        setUrl(sharedUrl || legacyUrl)
        setNotice('Odkaz bol predvyplnený.')
        return
      }

      const combinedText = [sharedTitle, sharedText, legacyText].filter(Boolean).join('\n\n').trim()
      if (combinedText) {
        setType('email')
        setText(combinedText)
        setNotice('Text správy bol predvyplnený.')
      }
    }

    hydrateSharedDraft()
  }, [])

  function resetResultOnTypeChange(nextType: InputType) {
    setType(nextType)
    setError('')
    setInlineResult(null)
    setNotice('')

    if (nextType === 'call') {
      router.push('/submit-call')
    }
  }

  function hasRequiredInput() {
    if (!isLoggedIn || !submittedBy.trim()) return false
    if (type === 'url') return Boolean(url.trim())
    if (type === 'image') return Boolean(imageFile)
    if (type === 'email') return Boolean(emailFile || text.trim())
    return Boolean(text.trim())
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!hasRequiredInput()) return

    if (!isLoggedIn) {
      setError('Na overovanie sa najprv prihláste.')
      return
    }

    setLoading(true)
    setLoadingStage('Analyzujem...')
    setError('')
    setInlineResult(null)

    try {
      let data: AnalyzeApiResponse

      if (type === 'url') {
        setLoadingStage('Sťahujem stránku...')
        const response = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, submittedBy, companyId }),
        })
        const payload = await response.json() as AnalyzeApiResponse
        if (!response.ok) throw new Error(payload.error || 'API chyba')
        data = payload
      } else if (type === 'email' && emailFile) {
        setLoadingStage('Spracovávam e-mail...')
        const body = new FormData()
        body.append('email', emailFile)
        body.append('submittedBy', submittedBy)
        body.append('companyId', companyId)

        const response = await fetch('/api/analyze-email-file', { method: 'POST', body })
        const payload = await response.json() as AnalyzeApiResponse
        if (!response.ok) throw new Error(payload.error || 'API chyba')
        data = payload
      } else if (type === 'image' && imageFile) {
        setLoadingStage('Čítam screenshot...')
        const body = new FormData()
        body.append('image', imageFile)
        body.append('submittedBy', submittedBy)
        body.append('companyId', companyId)

        const response = await fetch('/api/analyze-image', { method: 'POST', body })
        const payload = await response.json() as AnalyzeApiResponse
        if (!response.ok) throw new Error(payload.error || 'API chyba')
        data = payload
      } else {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, submittedBy, companyId, source: getLocalSource(type) }),
        })
        const payload = await response.json() as AnalyzeApiResponse
        if (!response.ok) throw new Error(payload.error || 'API chyba')
        data = payload
      }

      if (data.id) {
        router.push(`/report/${data.id}`)
        return
      }

      if (isLoggedIn) {
        saveLocalRequest({
          companyId,
          submittedBy,
          text: type === 'url'
            ? `Analyzuj túto webstránku z hľadiska podvodu/phishingu:\n\nURL: ${url}`
            : type === 'image'
              ? `Analyzuj tento screenshot z hľadiska podvodu.\n\n${data.extractedText || imageFile?.name || ''}`.trim()
              : emailFile
                ? `Analyzovaný exportovaný e-mail: ${emailFile.name}\n\n${text}`.trim()
                : type === 'sms'
                  ? `SMS správa na overenie:\n\n${text}`
                  : text,
          riskLevel: data.riskLevel,
          reasons: data.reasons,
          recommendation: data.recommendation,
          source: getLocalSource(type),
        })
      }

      setInlineResult({
        riskLevel: data.riskLevel,
        reasons: data.reasons,
        recommendation: data.recommendation,
        hostname: data.hostname,
        title: data.title,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa spojiť s API.')
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 selection:bg-teal-500 selection:text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">TrustStep analýza</div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
            Overte podozrivú správu bez zbytočného procesu
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-gray-600">
            Vyberte typ obsahu, vložte text alebo súbor a spustite analýzu. Výsledok uvidíte hneď.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-9">
          <div>
            <div className="mb-3 text-sm font-bold text-gray-950">Čo chcete overiť?</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-gray-200 py-4 sm:grid-cols-4">
              {INPUT_TYPES.map((item) => {
                const Icon = item.icon
                const active = type === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => resetResultOnTypeChange(item.id)}
                    className={`flex items-center gap-2 py-2 text-left text-sm font-bold transition-colors ${
                      active ? 'text-teal-700' : 'text-gray-500 hover:text-gray-950'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-gray-500">
              SMS a chat správy vložte ako text. Hovor zostáva samostatný flow s prepisom nahrávky.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-950">{activeCopy.title}</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">{activeCopy.helper}</p>
          </div>

          {notice && (
            <div className="border-l-2 border-blue-500 pl-4 text-sm font-medium text-blue-800">{notice}</div>
          )}

          {type === 'url' ? (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800">URL</label>
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={activeCopy.placeholder}
                required
                className="w-full border-b border-gray-300 bg-transparent py-4 font-mono text-base text-gray-950 outline-none placeholder:text-gray-400 focus:border-teal-600"
              />
            </div>
          ) : type === 'image' ? (
            <div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] ?? null)
                  setInlineResult(null)
                  setError('')
                }}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex w-full items-center justify-between border-y border-gray-200 py-6 text-left"
              >
                <span>
                  <span className="block text-base font-extrabold text-gray-950">
                    {imageFile ? imageFile.name : 'Vybrať screenshot alebo fotku'}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-gray-500">
                    PNG, JPG, WEBP, HEIC
                  </span>
                </span>
                <FileUp className="h-5 w-5 text-teal-700" />
              </button>

              {imageFile && imagePreview && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">{Math.round(imageFile.size / 1024)} kB</span>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null)
                        if (imageInputRef.current) imageInputRef.current.value = ''
                      }}
                      className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                      Odstrániť
                    </button>
                  </div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                    <Image src={imagePreview} alt="Náhľad screenshotu" fill className="object-contain" unoptimized />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <label className="block text-sm font-bold text-gray-800">
                  {type === 'sms' ? 'Text SMS' : 'Text'}
                </label>

                {type === 'email' && (
                  <>
                    <input
                      ref={emailFileInputRef}
                      type="file"
                      accept=".eml,message/rfc822"
                      className="hidden"
                      onChange={(event) => {
                        setEmailFile(event.target.files?.[0] ?? null)
                        setInlineResult(null)
                        setError('')
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => emailFileInputRef.current?.click()}
                      className="text-sm font-bold text-teal-700 hover:text-teal-900"
                    >
                      Nahrať .eml
                    </button>
                  </>
                )}
              </div>

              {emailFile && (
                <div className="mb-4 flex items-center justify-between border-y border-gray-200 py-3">
                  <div>
                    <div className="text-sm font-bold text-gray-950">{emailFile.name}</div>
                    <div className="text-xs font-medium text-gray-500">{Math.max(1, Math.round(emailFile.size / 1024))} kB</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailFile(null)
                      if (emailFileInputRef.current) emailFileInputRef.current.value = ''
                    }}
                    className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                    Odstrániť
                  </button>
                </div>
              )}

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={activeCopy.placeholder}
                required={type !== 'email' || !emailFile}
                rows={9}
                className="w-full resize-none border-y border-gray-200 bg-transparent py-4 font-mono text-sm leading-relaxed text-gray-950 outline-none placeholder:text-gray-400 focus:border-teal-600"
              />
            </div>
          )}

          <div className="rounded-3xl border border-teal-100 bg-teal-50/70 px-5 py-4">
            <div className="text-sm font-bold text-teal-900">Výsledok sa uloží do účtu</div>
            <div className="mt-2 text-[15px] font-semibold text-gray-900">{submittedBy}</div>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">
              Analýza sa priradí k prihlásenému účtu a zobrazí sa v histórii aj dashboarde.
            </p>
          </div>

          {error && (
            <div className="border-l-2 border-red-500 pl-4 text-sm font-medium text-red-700">{error}</div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={loading || !hasRequiredInput()}
              className="inline-flex items-center justify-center gap-2 bg-gray-950 px-7 py-4 text-base font-extrabold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {loadingStage}
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Spustiť analýzu
                </>
              )}
            </button>

          </div>
        </form>

        {inlineResult && (
          <div className="mt-12 border-t border-gray-200 pt-8">
            <AnalysisInsights
              riskLevel={inlineResult.riskLevel}
              reasons={inlineResult.reasons}
              recommendation={inlineResult.recommendation}
              hostname={inlineResult.hostname}
              title={inlineResult.title}
            />

            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                  >
                    Otvoriť dashboard
                    <Send className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/link-check"
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-slate-50"
                  >
                    Overiť ďalší link
                  </Link>
                </>
              ) : (
                <>
                  <div className="min-w-full">
                    <h3 className="text-sm font-bold text-gray-950">Chcete ukladať históriu a pokračovať bez limitu?</h3>
                    <p className="mt-1 text-sm font-medium text-gray-500">Vytvorte si účet a výsledky budete mať pokope.</p>
                  </div>
                  <Link href="/register" className="text-sm font-bold text-teal-700 hover:text-teal-900">
                    Vytvoriť účet
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
