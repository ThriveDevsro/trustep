'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthGoogleButton, AuthMicrosoftButton } from '@/components/AuthGoogleButton'
import { AuthShell } from '@/components/AuthShell'
import { getSupabase } from '@/lib/supabase'
import { getAppAuthHeaders, registerWithLocalAuth } from '@/lib/app-auth'
import { startSocialAuth } from '@/lib/social-auth'

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
    try {
      await startSocialAuth('google', getNextPath())
    } catch (err) {
      setError(getRegisterErrorMessage(err))
      setGoogleLoading(false)
    }
  }

  async function handleMicrosoftRegister() {
    setMicrosoftLoading(true)
    setError('')
    try {
      await startSocialAuth('azure', getNextPath())
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
            headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
            body: JSON.stringify({
              companyName: fullName,
              accountType: 'business',
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
    <AuthShell
      title="Vytvorte firemný účet"
      description="Nastavte bezpečný postup pre svoj tím."
      footer={
        <>
          Už máte účet?{' '}
          <Link href="/login" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
            Prihlásiť sa
          </Link>
        </>
      }
    >
      <div className="grid gap-3">
        <AuthGoogleButton loading={googleLoading} onClick={handleGoogleRegister} label="Pokračovať cez Google" />
        <AuthMicrosoftButton loading={microsoftLoading} onClick={handleMicrosoftRegister} label="Pokračovať cez Microsoft" />
      </div>

      <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        alebo e-mailom
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form className="space-y-5" onSubmit={handleRegister}>
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-sm font-semibold text-[#0F172A]">
            Názov firmy
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="organization"
            placeholder="Názov vašej firmy"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-[#0F172A]">
            E-mailová adresa
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="meno@firma.sk"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-[#0F172A]">
            Heslo
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Minimálne 6 znakov"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <span className="relative mt-0.5 flex items-center justify-center">
            <input
              type="checkbox"
              required
              className="peer h-5 w-5 appearance-none rounded-md border border-slate-300 bg-white transition-colors checked:border-[#2563EB] checked:bg-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
            />
            <svg className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[13px] leading-5 text-slate-500">
            Súhlasím so{' '}
            <Link href="/podmienky-pouzivania" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
              Všeobecnými podmienkami
            </Link>{' '}
            a{' '}
            <Link href="/ochrana-sukromia" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
              Zásadami ochrany osobných údajov
            </Link>.
          </span>
        </label>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2563EB] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Vytvoriť účet'}
        </button>
      </form>
    </AuthShell>
  )
}
