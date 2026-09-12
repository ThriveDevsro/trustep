'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthGoogleButton, AuthMicrosoftButton } from '@/components/AuthGoogleButton'
import { AuthShell } from '@/components/AuthShell'
import { getSupabase } from '@/lib/supabase'
import { getAppAuthHeaders, signInWithLocalAuth } from '@/lib/app-auth'
import { startSocialAuth } from '@/lib/social-auth'

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
    try {
      await startSocialAuth('google', getNextPath())
    } catch (err) {
      setError(getLoginErrorMessage(err))
      setGoogleLoading(false)
    }
  }

  async function handleMicrosoftLogin() {
    setMicrosoftLoading(true)
    setError('')
    try {
      await startSocialAuth('azure', getNextPath())
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
            headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
            body: JSON.stringify({
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
    <AuthShell
      title="Vitajte späť"
      description="Prihláste sa do firemného účtu a pokračujte vo svojich overeniach."
      footer={
        <>
          Nemáte ešte firemný účet?{' '}
          <Link href="/register" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
            Vytvoriť účet
          </Link>
        </>
      }
    >
      <div className="grid gap-3">
        <AuthGoogleButton loading={googleLoading} onClick={handleGoogleLogin} label="Pokračovať cez Google" />
        <AuthMicrosoftButton loading={microsoftLoading} onClick={handleMicrosoftLogin} label="Pokračovať cez Microsoft" />
      </div>

      <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        alebo e-mailom
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form className="space-y-5" onSubmit={handleLogin}>
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
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="password" className="block text-sm font-semibold text-[#0F172A]">
              Heslo
            </label>
            <Link href="/reset-hesla" className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
              Zabudli ste heslo?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Vaše heslo"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2563EB] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Prihlásiť sa'}
        </button>
      </form>
    </AuthShell>
  )
}
