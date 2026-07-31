'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthGoogleButton, AuthMicrosoftButton } from '@/components/AuthGoogleButton'
import { BrandLogo } from '@/components/BrandLogo'
import { getSupabase } from '@/lib/supabase'
import { registerWithLocalAuth } from '@/lib/app-auth'

interface RegisterApiResponse {
  success?: boolean
  error?: string
}

function getNextPath() {
  if (typeof window === 'undefined') return '/dashboard'
  const next = new URLSearchParams(window.location.search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

function getRegisterErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('user already registered') || message.includes('already been registered')) return 'Účet s týmto e-mailom už existuje.'
    if (message.includes('password')) return 'Heslo musí mať aspoň 6 znakov.'
    if (message.includes('invalid email')) return 'Zadajte platný e-mail.'
    return error.message
  }

  return 'Nastala chyba pri registrácii.'
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleGoogleRegister() {
    setGoogleLoading(true)
    setError('')

    const supabase = getSupabase()
    if (!supabase) {
      setError('Google registrácia vyžaduje Supabase. Použite e-mail a heslo.')
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
      setError(getRegisterErrorMessage(err))
      setGoogleLoading(false)
    }
  }

  async function handleMicrosoftRegister() {
    setMicrosoftLoading(true)
    setError('')
    const supabase = getSupabase()
    if (!supabase) {
      setError('Microsoft registrácia vyžaduje Supabase. Použite e-mail a heslo.')
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
      setError(getRegisterErrorMessage(err))
      setMicrosoftLoading(false)
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(event.currentTarget)
    const fullName = String(formData.get('fullName') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      const supabase = getSupabase()

      if (supabase) {
        const registerResponse = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName }),
        })

        const registerPayload = (await registerResponse.json()) as RegisterApiResponse
        if (!registerResponse.ok) {
          if (registerResponse.status !== 503) {
            throw new Error(registerPayload.error || 'Registráciu sa nepodarilo dokončiť.')
          }

          const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectTo,
              data: { full_name: fullName },
            },
          })

          if (signUpError) throw signUpError

          if (!data.session) {
            setSuccess('Poslali sme vám potvrdzovací odkaz. Po potvrdení sa účet aktivuje.')
            return
          }
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError

        const { data: userData } = await supabase.auth.getUser()
        if (userData.user?.id && userData.user.email) {
          const profileResponse = await fetch('/api/register-company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userData.user.id,
              companyName: fullName,
              approverEmail: userData.user.email,
            }),
          })

          if (!profileResponse.ok) {
            console.warn('[auth] profile upsert failed after email registration')
          }
        }
      } else {
        await registerWithLocalAuth(email, password)
      }

      router.push(getNextPath())
      router.refresh()
    } catch (err) {
      setError(getRegisterErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-white text-slate-800 md:grid-cols-12">
      <section className="hidden border-r border-slate-800 bg-[#111827] p-12 md:col-span-6 md:flex md:flex-col lg:p-16">
        <Link href="/"><BrandLogo theme="light" size="md" /></Link>
        <div className="relative my-auto h-[420px] w-full">
          <Image src="/truststep-team-flow.png" alt="" fill priority sizes="50vw" className="object-contain" />
        </div>
        <div className="max-w-lg border-t border-slate-700 pt-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">Jedno miesto pre bezpečnejšie rozhodnutia</h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">Overujte správy, odkazy a platobné pokyny. Sami alebo spolu s firemným tímom.</p>
        </div>
      </section>

      <section className="col-span-12 flex min-h-screen flex-col justify-between overflow-y-auto bg-white p-8 sm:p-16 lg:p-24 md:col-span-6">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <BrandLogo size="sm" />
        </Link>

        <div />

        <div className="mx-auto my-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold leading-none tracking-tight text-slate-950">Vytvoriť účet</h1>
            <p className="text-sm font-medium text-slate-400">Overovanie je dostupné po prihlásení do TrustStep účtu.</p>
          </div>

          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Celé meno</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                placeholder="Ján Kováč"
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400 transition-colors focus:border-slate-950 focus:outline-none"
              />
            </div>

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
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Heslo</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400 transition-colors focus:border-slate-950 focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2.5 pt-1">
              <input type="checkbox" required className="mt-0.5 rounded border-slate-300 accent-teal-600" />
              <span className="text-[11px] leading-normal text-slate-400">
                Súhlasím so <span className="font-medium text-teal-600">Všeobecnými podmienkami</span> a <span className="font-medium text-teal-600">Zásadami ochrany osobných údajov</span>.
              </span>
            </label>

            {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
            {success && <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">{success}</div>}

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center bg-slate-950 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Zaregistrovať sa'}
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="mx-4 flex-shrink font-mono text-[10px] uppercase text-slate-400">alebo</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <div className="grid gap-3">
              <AuthGoogleButton loading={googleLoading} onClick={handleGoogleRegister} label="Registrovať cez Google" />
              <AuthMicrosoftButton loading={microsoftLoading} onClick={handleMicrosoftRegister} label="Registrovať cez Microsoft" />
            </div>
          </form>
        </div>

        <div className="pt-6 text-center text-xs font-semibold text-slate-400">
          <span>Už máte u nás vytvorený účet?</span>
          <Link href="/login" className="ml-1 font-bold text-[#FF4F00] hover:underline">Prihlásiť sa</Link>
        </div>
      </section>
    </div>
  )
}
