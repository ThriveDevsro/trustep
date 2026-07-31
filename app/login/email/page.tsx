'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Loader2, ArrowLeft } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { signInWithLocalAuth } from '@/lib/app-auth'

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('email not confirmed')) {
      return 'Najprv potvrďte registračný e-mail a potom sa prihláste.'
    }

    if (message.includes('invalid login credentials')) {
      return 'Nesprávny e-mail alebo heslo.'
    }

    return error.message
  }

  return 'Prihlásenie zlyhalo.'
}

export default function LoginEmailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      const supabase = getSupabase()

      if (supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

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

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(getLoginErrorMessage(err))
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
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Prihlásenie e-mailom</h2>
          <p className="mt-2 text-[15px] font-medium text-gray-500">Zadajte svoj e-mail a heslo</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-10 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-3xl sm:px-10 border border-gray-100">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-800 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Späť na výber
            </Link>

            <form className="space-y-6" onSubmit={handleLogin}>
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
                    autoComplete="current-password"
                    required
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
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Prihlásiť sa do dashboardu'}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium">
                Nemáte ešte účet?{' '}
                <Link href="/register" className="font-bold text-teal-700 hover:text-teal-600">
                  Vytvorte si účet
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
