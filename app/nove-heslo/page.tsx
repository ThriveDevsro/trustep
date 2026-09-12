'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

export default function NewPasswordPage() {
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkRecoverySession() {
      const supabase = getSupabase()
      if (!supabase) {
        if (!cancelled) {
          setError('Obnova hesla nie je dostupná.')
          setChecking(false)
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!cancelled) {
        setReady(Boolean(data.session))
        if (!data.session) setError('Obnovovací odkaz je neplatný alebo už vypršal.')
        setChecking(false)
      }
    }

    checkRecoverySession()
    return () => { cancelled = true }
  }, [])

  async function handleNewPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') || '')
    const confirmation = String(formData.get('confirmation') || '')

    if (password.length < 8) {
      setError('Nové heslo musí mať aspoň 8 znakov.')
      setLoading(false)
      return
    }
    if (password !== confirmation) {
      setError('Zadané heslá sa nezhodujú.')
      setLoading(false)
      return
    }

    const supabase = getSupabase()
    if (!supabase) {
      setError('Obnova hesla nie je dostupná.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setSuccess(true)
    setLoading(false)
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
          {checking ? (
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-950" />
          ) : success ? (
            <div className="text-center">
              <h1 className="text-4xl font-extrabold leading-none tracking-tight text-slate-950">Heslo je zmenené</h1>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-500">Teraz sa môžete prihlásiť pomocou nového hesla.</p>
              <Link href="/login" className="mt-8 inline-flex min-h-12 items-center justify-center bg-slate-950 px-7 text-sm font-extrabold text-white">Prihlásiť sa</Link>
            </div>
          ) : (
            <>
              <div className="space-y-3 text-center">
                <h1 className="text-4xl font-extrabold leading-none tracking-tight text-slate-950">Nové heslo</h1>
                <p className="text-sm font-medium leading-7 text-slate-400">Zvoľte si nové heslo, ktoré nepoužívate na inom účte.</p>
              </div>

              {ready && (
                <form className="mt-8 space-y-5" onSubmit={handleNewPassword}>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nové heslo</label>
                    <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 focus:border-slate-950 focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="confirmation" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Zopakovať heslo</label>
                    <input id="confirmation" name="confirmation" type="password" required minLength={8} autoComplete="new-password" className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 focus:border-slate-950 focus:outline-none" />
                  </div>
                  <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center bg-slate-950 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Uložiť nové heslo'}
                  </button>
                </form>
              )}

              {error && <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
              {!ready && <Link href="/reset-hesla" className="mt-6 inline-flex text-sm font-bold text-[#2563EB] hover:underline">Poslať nový odkaz</Link>}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
