'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnalysisInsights } from '@/components/AnalysisInsights'
import { getCurrentAppUser } from '@/lib/app-auth'
import { saveLocalRequest } from '@/lib/local-history'
import {
  AlertCircle,
  AudioLines,
  Loader2,
  Phone,
  UploadCloud,
  X,
} from 'lucide-react'

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

interface CallAnalyzeApiResponse {
  id: string | null
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
  transcription: string
  error?: string
}

interface InlineCallResult {
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
  transcription: string
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

export default function SubmitCallPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('')
  const [error, setError] = useState('')
  const [inlineResult, setInlineResult] = useState<InlineCallResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [companyId, setCompanyId] = useState(DEMO_COMPANY_ID)
  const [authChecked, setAuthChecked] = useState(false)
  const [sharedPrefillNotice, setSharedPrefillNotice] = useState('')

  useEffect(() => {
    async function checkAuth() {
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

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!audioFile) {
      setAudioPreview('')
      return
    }

    const objectUrl = URL.createObjectURL(audioFile)
    setAudioPreview(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [audioFile])

  useEffect(() => {
    async function hydrateSharedDraft() {
      const params = new URLSearchParams(window.location.search)
      const shareError = params.get('share_error')?.trim() ?? ''
      const shareDraftId = params.get('share_draft')?.trim() ?? ''
      const submittedByPrefill = params.get('submitted_by')?.trim() ?? ''

      if (submittedByPrefill) {
        setSubmittedBy((current) => current || submittedByPrefill)
      }

      if (shareError === 'unsupported_file') {
        setError('Z mobilu je zatiaľ podporované priame zdieľanie obrázkov a audio súborov.')
      } else if (shareError === 'file_too_large') {
        setError('Zdieľaný súbor je príliš veľký.')
      } else if (shareError === 'failed') {
        setError('Zdieľanie do TrustStepu sa nepodarilo spracovať.')
      }

      if (!shareDraftId) return

      try {
        const response = await fetch(`/api/share-drafts/${shareDraftId}`)
        if (!response.ok) return

        const draft = await response.json() as ShareDraftPayload
        if (!draft.file?.dataUrl) return

        const fileResponse = await fetch(draft.file.dataUrl)
        const blob = await fileResponse.blob()
        const nextFile = new File([blob], draft.file.name || 'shared-audio', {
          type: draft.file.type || blob.type || 'audio/mpeg',
        })

        setAudioFile(nextFile)
        setSharedPrefillNotice('Do TrustStepu bola predvyplnená zdieľaná hlasovka alebo audio súbor z mobilu či inej aplikácie.')
      } catch (draftError) {
        console.error('[submit-call-share-draft]', draftError)
      }
    }

    hydrateSharedDraft()
  }, [])

  function selectAudioFile(file: File | null) {
    setInlineResult(null)
    setError('')
    setAudioFile(file)
  }

  function resetAudioFile() {
    setAudioFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!isLoggedIn) {
      setError('Na overovanie sa najprv prihláste.')
      return
    }

    if (!submittedBy.trim() || !audioFile) return

    setLoading(true)
    setLoadingStage('Nahrávam súbor...')
    setError('')
    setInlineResult(null)

    try {
      const body = new FormData()
      body.append('audio', audioFile)
      body.append('submittedBy', submittedBy)
      body.append('companyId', companyId)

      const response = await fetch('/api/analyze-call', {
        method: 'POST',
        body,
      })

      setLoadingStage('Prepisujem hovor a AI analyzuje...')

      const payload = await response.json() as CallAnalyzeApiResponse
      if (!response.ok) throw new Error(payload.error || 'API chyba')

      if (payload.id) {
        router.push(`/report/${payload.id}`)
        return
      }

      if (isLoggedIn) {
        saveLocalRequest({
          companyId,
          submittedBy,
          text: `Nahrávka hovoru od: ${submittedBy}\n\n${payload.transcription}`.trim(),
          riskLevel: payload.riskLevel,
          reasons: payload.reasons,
          recommendation:
            payload.riskLevel === 'high'
              ? 'Hovor neprijímajte ako dôveryhodný bez spätného overenia cez oficiálny kontakt.'
              : payload.riskLevel === 'medium'
                ? 'Pred akoukoľvek akciou si informácie overte mimo pôvodného hovoru.'
                : 'V hovore sa nenašli silné znaky podvodu, pokračujte však opatrne.',
          source: 'call',
        })
      }

      setInlineResult({
        riskLevel: payload.riskLevel,
        reasons: payload.reasons,
        transcription: payload.transcription,
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Nepodarilo sa spracovať nahrávku.')
    } finally {
      setLoading(false)
      setLoadingStage('')
    }
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-teal-500 selection:text-white">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-teal-200/50 bg-teal-100 p-3 text-teal-700 shadow-sm">
            <Phone className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Analýza Nahrávky Hovoru</h1>
          <p className="mt-2 font-medium text-gray-500">
            Nahrajte hlasovku, export hovoru alebo záznam z mobilu. TrustStep spraví prepis a vyhodnotí manipulatívne vzorce bez ručného prepisovania.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8">
          <div className="mb-8 rounded-2xl border border-teal-100 bg-teal-50 p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-teal-800">Funguje Aj Mimo Webu</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-teal-900">
              Používateľ nemusí nič prepisovať. Stačí exportovať hlasovku z mobilu, WhatsAppu alebo diktafónu a nahrať ju sem.
              Výsledkom je automatický prepis a rovnaký report ako pri e-maile či screenshote.
            </p>
          </div>

          {sharedPrefillNotice && (
            <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-900">
              {sharedPrefillNotice}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Váš e-mail v účte <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={submittedBy}
                onChange={(event) => setSubmittedBy(event.target.value)}
                placeholder="napr. jan.novak@firma.sk"
                required
                disabled
                className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <p className="mt-2 text-sm text-gray-500">Výsledok aj prepis sa uložia do prihláseného účtu.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Audio súbor <span className="text-red-500">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.webm"
                className="hidden"
                onChange={(event) => selectAudioFile(event.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  const file = event.dataTransfer.files?.[0] ?? null
                  selectAudioFile(file)
                }}
                className={`w-full rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-300 bg-slate-50 hover:border-teal-500 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="mx-auto h-8 w-8 text-teal-600" />
                <div className="mt-3 text-lg font-bold text-gray-900">Nahrajte audio súbor</div>
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Podporované formáty: MP3, WAV, M4A, OGG, AAC, WebM. Funguje aj s exportom z mobilu alebo hlasovkou z chatu.
                </p>
              </button>
            </div>

            {audioFile && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{audioFile.name}</p>
                    <p className="text-xs font-medium text-gray-500">
                      {Math.max(1, Math.round(audioFile.size / 1024))} kB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAudioFile}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Odstrániť
                  </button>
                </div>

                {audioPreview && (
                  <audio controls className="w-full">
                    <source src={audioPreview} type={audioFile.type || 'audio/mpeg'} />
                  </audio>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isLoggedIn || !submittedBy.trim() || !audioFile}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 font-bold text-white shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] transition-all hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {loadingStage || 'Spracovávam...'}
                </>
              ) : (
                <>
                  <AudioLines className="h-5 w-5" />
                  Spustiť prepis a analýzu hovoru
                </>
              )}
            </button>

          </form>

          {inlineResult && (
            <div className="mt-8 space-y-4 border-t border-gray-100 pt-8">
              <AnalysisInsights
                riskLevel={inlineResult.riskLevel}
                reasons={inlineResult.reasons}
                recommendation={
                  inlineResult.riskLevel === 'high'
                    ? 'Hovor neprijímajte ako dôveryhodný bez spätného overenia cez oficiálny kontakt.'
                    : inlineResult.riskLevel === 'medium'
                      ? 'Pred akoukoľvek akciou si informácie overte mimo pôvodného hovoru.'
                      : 'V hovore sa nenašli silné znaky podvodu, pokračujte však opatrne.'
                }
              />

              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">Automatický Prepis</h3>
                <pre className="mt-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700">
                  {inlineResult.transcription}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
            <p className="text-sm font-medium leading-relaxed text-orange-800">
              Z právnych a etických dôvodov nikdy nenahrávajte hovory bez predchádzajúceho súhlasu druhej strany. Systém je určený výhradne pre analýzu vlastných alebo schválených nahrávok.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
