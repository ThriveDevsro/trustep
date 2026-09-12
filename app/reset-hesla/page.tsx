'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'

function getResetErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Obnovu hesla sa nepodarilo odoslať.'

  const message = error.message.toLowerCase()
  if (message.includes('rate limit')) return 'Skúste to znovu o niekoľko minút.'
  if (message.includes('invalid email')) return 'Zadajte platnú e-mailovú adresu.'
  return error.message
}

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const email = String(new FormData(event.currentTarget).get('email') || '').trim()
    const supabase = getSupabase()

    if (!supabase) {
      setError('Obnova hesla e-mailom nie je v lokálnom režime dostupná.')
      setLoading(false)
      return
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/nove-heslo')}`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (resetError) throw resetError
      setSent(true)
    } catch (resetError) {
      setError(getResetErrorMessage(resetError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#fbfaf7] text-slate-800">
      <header className="absolute left-0 top-0 z-10 px-5 py-6 sm:px-8 sm:py-8">
        <Link href="/login" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Späť na prihlásenie
        </Link>
      </header>

      <main className="flex min-h-screen items-center justify-center px-6 py-28">
        <div className="w-full max-w-[420px]">
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-10 w-10 text-emerald-600" strokeWidth={1.7} />
              <h1 className="mt-6 text-4xl font-extrabold leading-none tracking-tight text-slate-950">Skontrolujte e-mail</h1>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-500">Ak účet s touto adresou existuje, poslali sme vám odkaz na nastavenie nového hesla.</p>
              <Link href="/login" className="mt-8 inline-flex min-h-12 items-center justify-center bg-slate-950 px-7 text-sm font-extrabold text-white">Späť na prihlásenie</Link>
            </div>
          ) : (
            <>
              <div className="space-y-3 text-center">
                <h1 className="text-4xl font-extrabold leading-none tracking-tight text-slate-950">Obnoviť heslo</h1>
                <p className="text-sm font-medium leading-7 text-slate-400">Zadajte e-mail k svojmu účtu. Pošleme vám bezpečný odkaz na nastavenie nového hesla.</p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleReset}>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mailová adresa</label>
                  <input id="email" name="email" type="email" required autoComplete="email" placeholder="name@email.com" className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400 focus:border-slate-950 focus:outline-none" />
                </div>
                {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
                <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center bg-slate-950 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Poslať obnovovací odkaz'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
