'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Loader2, ArrowLeft } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { registerWithLocalAuth } from '@/lib/app-auth'

interface RegisterState {
  title: string
  message: string
}

interface RegisterApiResponse {
  success?: boolean
  error?: string
}

function getRegisterErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('user already registered') || message.includes('already been registered')) {
      return 'Účet s týmto e-mailom už existuje.'
    }

    if (message.includes('password')) {
      return 'Heslo musí mať aspoň 6 znakov.'
    }

    if (message.includes('invalid email')) {
      return 'Zadajte platný e-mail.'
    }

    return error.message
  }

  return 'Nastala chyba pri registrácii.'
}

export default function RegisterEmailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<RegisterState | null>(null)

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      const supabase = getSupabase()

      if (supabase) {
        const registerResponse = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const registerPayload = (await registerResponse.json()) as RegisterApiResponse
        if (!registerResponse.ok) {
          if (registerResponse.status !== 503) {
            throw new Error(registerPayload.error || 'Registráciu sa nepodarilo dokončiť.')
          }

          const redirectTo = `${window.location.origin}/auth/callback`
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo },
          })

          if (signUpError) throw signUpError

          if (!data.session) {
            setSuccess({
              title: 'Skontrolujte e-mail',
              message: 'Poslali sme vám potvrdzovací odkaz. Po potvrdení sa účet aktivuje.',
            })
            return
          }
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw signInError
        }

        const { data: userData } = await supabase.auth.getUser()
        if (userData.user?.id && userData.user.email) {
          const profileResponse = await fetch('/api/register-company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userData.user.id,
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

      setSuccess({
        title: 'Registrácia úspešná',
        message: 'O chvíľu budete presmerovaný do dashboardu.',
      })

      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1200)
    } catch (err) {
      setError(getRegisterErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-500 selection:text-white">
      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="bg-teal-700 p-3 rounded-2xl text-white inline-flex shadow-sm mb-6">
            <Shield className="w-8 h-8" strokeWidth={2} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Registrácia e-mailom</h2>
          <p className="mt-2 text-[15px] font-medium text-gray-500">Zadajte svoj e-mail a heslo</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-10 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-3xl sm:px-10 border border-gray-100">
            <Link href="/register" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-800 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Späť na výber
            </Link>

            {success ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold">✓</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{success.title}</h3>
                <p className="text-gray-500 font-medium">{success.message}</p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleRegister}>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">E-mail</label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="appearance-none block w-full bg-white px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all sm:text-sm font-medium"
                      placeholder="napr. jana@domain.sk"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Heslo</label>
                  <div className="mt-2">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className="appearance-none block w-full bg-white px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all sm:text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-bold px-4 py-3 rounded-xl">{error}</div>}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vytvoriť účet zadarmo'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 text-center pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium">
                Už máte vytvorený účet?{' '}
                <Link href="/login" className="font-bold text-teal-700 hover:text-teal-600">
                  Prihláste sa
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
