'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clipboard, Loader2, MessageSquare, ShieldAlert } from 'lucide-react'
import { RiskBadge } from '@/components/RiskBadge'
import type { AnalysisResult } from '@/lib/types'

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

type SmsResult = AnalysisResult & {
  id?: string | null
}

export default function SmsQuickCheckPage() {
  const [smsText, setSmsText] = useState('')
  const [phoneOrEmail, setPhoneOrEmail] = useState('')
  const [result, setResult] = useState<SmsResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [clipboardState, setClipboardState] = useState<'idle' | 'ok' | 'failed'>('idle')

  async function pasteFromClipboard() {
    setClipboardState('idle')
    setError('')

    try {
      const value = await navigator.clipboard.readText()
      setSmsText(value)
      setClipboardState('ok')
    } catch {
      setClipboardState('failed')
      setError('Prehliadač nepovolil čítanie schránky. Podržte pole nižšie a zvoľte Vložiť.')
    }
  }

  async function analyzeSms(event: React.FormEvent) {
    event.preventDefault()
    if (!smsText.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `SMS správa na overenie:\n\n${smsText}`,
          submittedBy: phoneOrEmail.trim() || 'rýchla SMS kontrola',
          companyId: DEMO_COMPANY_ID,
          source: 'sms',
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Analýza zlyhala.')

      setResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa spojiť s TrustStep API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-950">Rýchle overenie SMS</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-gray-600">
            Skopírujte podozrivú SMS, vložte ju sem a TrustStep okamžite skontroluje linky, urgentný jazyk,
            platobné výzvy a žiadosti o údaje.
          </p>
        </div>

        <form onSubmit={analyzeSms} className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
              <p className="text-sm font-semibold leading-relaxed text-amber-900">
                Neklikajte na link v SMS. Najprv skopírujte text správy a overte ho tu.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-800">Kontakt pre históriu výsledkov</label>
            <input
              value={phoneOrEmail}
              onChange={(event) => setPhoneOrEmail(event.target.value)}
              placeholder="voliteľné: vaše číslo alebo e-mail"
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-bold text-gray-800">Text SMS</label>
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-slate-50"
              >
                <Clipboard className="h-3.5 w-3.5" />
                Vložiť zo schránky
              </button>
            </div>
            <textarea
              value={smsText}
              onChange={(event) => setSmsText(event.target.value)}
              placeholder="Sem vložte celú SMS vrátane odkazu..."
              rows={8}
              required
              className="w-full resize-none rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3.5 font-mono text-sm leading-relaxed text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
            />
            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-400">
              <span>{clipboardState === 'ok' ? 'Text bol vložený zo schránky.' : `${smsText.length} znakov`}</span>
              <span>{clipboardState === 'failed' ? 'Schránka nie je dostupná' : 'SMS / iMessage / WhatsApp text'}</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !smsText.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-4 text-base font-extrabold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5" />}
            {loading ? 'Analyzujem SMS...' : 'Overiť SMS'}
          </button>
        </form>

        {result && (
          <section className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-gray-400">Výsledok</div>
                <h2 className="text-2xl font-extrabold text-gray-950">Riziko SMS</h2>
              </div>
              <RiskBadge level={result.riskLevel} />
            </div>

            <div className="space-y-3">
              {result.reasons.map((reason) => (
                <div key={reason} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-teal-700" />
                  <p className="text-sm font-semibold leading-relaxed text-gray-700">{reason}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">Odporúčanie</div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-teal-950">{result.recommendation}</p>
            </div>
          </section>
        )}

        <div className="mt-8 text-center">
          <Link href="/submit" className="text-sm font-bold text-teal-700 hover:text-teal-900">
            Otvoriť plný TrustStep formulár
          </Link>
        </div>
      </div>
    </main>
  )
}
