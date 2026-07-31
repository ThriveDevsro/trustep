'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthGoogleButton, AuthMicrosoftButton } from '@/components/AuthGoogleButton'
import { BrandLogo } from '@/components/BrandLogo'
import { getSupabase } from '@/lib/supabase'
import { signInWithLocalAuth } from '@/lib/app-auth'

function getNextPath() {
  if (typeof window === 'undefined') return '/dashboard'
  const next = new URLSearchParams(window.location.search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('email not confirmed')) return 'Najprv potvrďte registračný e-mail a potom sa prihláste.'
    if (message.includes('invalid login credentials')) return 'Nesprávny e-mail alebo heslo.'
    return error.message
  }

  return 'Prihlásenie zlyhalo.'
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')

    const supabase = getSupabase()
    if (!supabase) {
      setError('Google prihlásenie vyžaduje Supabase. Použite e-mail a heslo.')
      setGoogleLoading(false)
      return
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (oauthError) throw oauthError
    } catch (err) {
      setError(getLoginErrorMessage(err))
      setGoogleLoading(false)
    }
  }

  async function handleMicrosoftLogin() {
    setMicrosoftLoading(true)
    setError('')
    const supabase = getSupabase()
    if (!supabase) {
      setError('Microsoft prihlásenie vyžaduje Supabase. Použite e-mail a heslo.')
      setMicrosoftLoading(false)
      return
    }
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: { redirectTo, scopes: 'email' },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setError(getLoginErrorMessage(err))
      setMicrosoftLoading(false)
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      const supabase = getSupabase()

      if (supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError

        if (data.user?.id && data.user.email) {
          const profileResponse = await fetch('/api/register-company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              approverEmail: data.user.email,
            }),
          })

          if (!profileResponse.ok) {
            console.warn('[auth] profile upsert failed after email login')
          }
        }
      } else {
        await signInWithLocalAuth(email, password)
      }

      router.push(getNextPath())
      router.refresh()
    } catch (err) {
      setError(getLoginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-white text-slate-800 md:grid-cols-12">
      <section className="hidden border-r border-slate-800 bg-[#111827] p-12 md:col-span-6 md:flex md:flex-col lg:p-16">
        <Link href="/"><BrandLogo theme="light" size="md" /></Link>
        <div className="relative my-auto h-[420px] w-full">
          <Image src="/truststep-checkpoint.png" alt="" fill priority sizes="50vw" className="object-contain" />
        </div>
        <div className="max-w-lg border-t border-slate-700 pt-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">Pokračujte tam, kde ste prestali</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">Vaše analýzy, história a firemné nálezy zostávajú na jednom mieste.</p>
        </div>
      </section>

      <section className="col-span-12 flex min-h-screen flex-col justify-between overflow-y-auto bg-white p-8 sm:p-16 lg:p-24 md:col-span-6">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <BrandLogo size="sm" />
        </Link>

        <div />

        <div className="mx-auto my-auto w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold leading-none tracking-tight text-slate-950">Vitajte späť</h1>
            <p className="text-sm font-medium text-slate-400">Prihláste sa do svojho bezpečnostného profilu.</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mailová adresa</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@email.com"
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400 transition-colors focus:border-slate-950 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Heslo</label>
                <span className="text-xs font-semibold text-[#FF4F00]">Zabudli ste?</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400 transition-colors focus:border-slate-950 focus:outline-none"
              />
            </div>

            {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center bg-slate-950 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Prihlásiť sa'}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200" />
              <span className="mx-4 flex-shrink font-mono text-[10px] uppercase text-slate-400">alebo</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <div className="grid gap-3">
              <AuthGoogleButton loading={googleLoading} onClick={handleGoogleLogin} label="Pokračovať cez Google" />
              <AuthMicrosoftButton loading={microsoftLoading} onClick={handleMicrosoftLogin} label="Pokračovať cez Microsoft" />
            </div>
          </form>
        </div>

        <div className="pt-6 text-center text-xs font-semibold text-slate-400">
          <span>Nemáte ešte u nás účet?</span>
          <Link href="/register" className="ml-1 font-bold text-[#FF4F00] hover:underline">Zaregistrovať sa</Link>
        </div>
      </section>
    </div>
  )
}
