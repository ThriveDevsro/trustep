'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Shield } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { getAppAuthHeaders } from '@/lib/app-auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function completeOAuth() {
      const supabase = getSupabase()
      if (!supabase) {
        if (!cancelled) setError('Databáza nie je nakonfigurovaná.')
        return
      }

      try {
        const currentUrl = new URL(window.location.href)
        const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''))
        const authError = currentUrl.searchParams.get('error_description')
          || currentUrl.searchParams.get('error')
          || hashParams.get('error_description')
          || hashParams.get('error')
        const next = currentUrl.searchParams.get('next')
        const nextPath = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
        if (authError) {
          throw new Error(authError)
        }

        const authCode = currentUrl.searchParams.get('code')

        if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode)
          if (exchangeError) throw exchangeError
        }

        const { data, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!data.user?.email) throw new Error('OAuth prihlásenie sa nepodarilo dokončiť.')

        const response = await fetch('/api/register-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
          body: JSON.stringify({
            approverEmail: data.user.email,
          }),
        })

        if (!response.ok) {
          console.warn('[auth] profile upsert failed after OAuth callback')
        }

        router.replace(nextPath)
        router.refresh()
      } catch (oauthError) {
        if (!cancelled) {
          setError(oauthError instanceof Error ? oauthError.message : 'OAuth prihlásenie zlyhalo.')
        }
      }
    }

    completeOAuth()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-500 selection:text-white">
      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="bg-teal-700 p-3 rounded-2xl text-white inline-flex shadow-sm mb-6">
            <Shield className="w-8 h-8" strokeWidth={2} />
          </div>

          {error ? (
            <>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Prihlásenie zlyhalo</h1>
              <p className="mt-3 text-[15px] font-medium text-red-600">{error}</p>
              <Link href="/login" className="mt-6 inline-flex text-teal-700 font-bold hover:text-teal-600">
                Späť na prihlásenie
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dokončujem prihlásenie</h1>
              <p className="mt-3 text-[15px] font-medium text-gray-500">
                Pripravujem váš účet a presmerujem vás do dashboardu.
              </p>
              <div className="mt-6 flex justify-center">
                <Loader2 className="w-8 h-8 text-teal-700 animate-spin" />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
