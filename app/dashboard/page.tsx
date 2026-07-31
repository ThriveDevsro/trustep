'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deriveAccountNameFromEmail, getCurrentAppUser } from '@/lib/app-auth'
import { getSupabase } from '@/lib/supabase'
import type { RequestSource, RequestStatus, RiskLevel } from '@/lib/types'
import { Loader2, Plus } from 'lucide-react'

interface SecurityRequest {
  id: string
  submitted_by: string
  text: string
  risk_level: RiskLevel
  status: RequestStatus
  source: RequestSource
  phone_from?: string
  created_at: string
}

function summarizeRequest(request: SecurityRequest): string {
  const normalized = request.text
    .replace(/^Analyzovaný inbound e-mail:\s*/i, '')
    .replace(/^Analyzuj túto webstránku z hľadiska podvodu\/phishingu:\s*/i, '')
    .replace(/^Analyzuj tento screenshot z hľadiska podvodu, phishingu alebo manipulatívnej komunikácie\.\s*/i, '')
    .replace(/^Nahrávka hovoru od:\s*/i, '')
    .replace(/^SMS od:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.length > 96 ? `${normalized.slice(0, 96)}...` : normalized
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getReportHref(id: string): string {
  return id.startsWith('local-') ? `/report/local/${id}` : `/report/${id}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accountName, setAccountName] = useState('TrustStep účet')
  const [requests, setRequests] = useState<SecurityRequest[]>([])

  useEffect(() => {
    async function loadDashboard() {
      const user = await getCurrentAppUser()
      if (!user) {
        router.push('/login')
        return
      }

      const supabase = getSupabase()
      if (!supabase) {
        setAccountName(deriveAccountNameFromEmail(user.email))
        const response = await fetch('/api/dev-requests')
        if (response.ok) {
          const payload = await response.json()
          setRequests((payload.requests ?? []) as SecurityRequest[])
        } else {
          setRequests([])
        }
        setLoading(false)
        return
      }

      // 2. Stiahneme názov účtu/priestoru
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', user.id)
        .single()
      
      if (companyData) {
        setAccountName(companyData.name)
      }

      // 3. Stiahneme históriu analýz/žiadostí k tomuto účtu
      const { data: requestsData } = await supabase
        .from('requests')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false })

      if (requestsData) {
        setRequests(requestsData)
      }

      setLoading(false)
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#f5f5f2]">
        <Loader2 className="h-10 w-10 animate-spin text-[#ff4f00]" />
      </div>
    )
  }

  const totalAnalyzed = requests.length
  const protectedEmployees = new Set(requests.map(r => r.submitted_by)).size
  const riskyRequests = requests.filter((request) => request.risk_level === 'high' || request.risk_level === 'medium')
  const pendingIncidents = riskyRequests.filter((request) => request.status === 'pending')
  const recentCritical = requests.filter((request) => {
    if (request.risk_level !== 'high') return false
    return Date.now() - new Date(request.created_at).getTime() <= 1000 * 60 * 60 * 24
  })
  const alertCenterItems = [...riskyRequests]
    .sort((left, right) => {
      const severityDiff = (left.risk_level === 'high' ? 2 : 1) - (right.risk_level === 'high' ? 2 : 1)
      if (severityDiff !== 0) return severityDiff * -1
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    })
    .slice(0, 6)
  const sourceCounts: Record<RequestSource, number> = {
    email: requests.filter(r => r.source === 'email').length,
    web: requests.filter(r => r.source === 'web').length,
    call: requests.filter(r => r.source === 'call').length,
    sms: requests.filter(r => r.source === 'sms').length,
    image: requests.filter(r => r.source === 'image').length,
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f4f5f7] selection:bg-[#ff4f00] selection:text-white">
      <div className="mx-auto max-w-[1380px] px-5 py-8 sm:px-8 sm:py-11">
          <div className="space-y-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-[#111827] sm:text-4xl">Prehľad</h1>
                <p className="mt-2 text-sm font-semibold text-gray-400">{accountName}</p>
              </div>
              <Link
                href="/submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111827] px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-black"
              >
                <Plus className="h-4 w-4" />
                Nová analýza
              </Link>
            </header>

            <section className="rounded-[28px] bg-white p-7 sm:p-9">
              <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
                <div>
                  <p className={`text-6xl font-extrabold tracking-[-0.06em] ${pendingIncidents.length > 0 ? 'text-[#ff4f00]' : 'text-[#111827]'}`}>
                    {pendingIncidents.length}
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-[#111827]">
                    {pendingIncidents.length === 1 ? 'prípad čaká na rozhodnutie' : 'prípadov čaká na rozhodnutie'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-8 sm:text-right">
                  <div><strong className="block text-2xl font-extrabold">{totalAnalyzed}</strong><span className="text-xs font-semibold text-gray-400">Analýzy</span></div>
                  <div><strong className="block text-2xl font-extrabold">{recentCritical.length}</strong><span className="text-xs font-semibold text-gray-400">Dnes</span></div>
                  <div><strong className="block text-2xl font-extrabold">{protectedEmployees}</strong><span className="text-xs font-semibold text-gray-400">Ľudia</span></div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {([
                  ['email', 'E-mail'], ['image', 'Obrázky'], ['web', 'Linky'], ['sms', 'SMS'], ['call', 'Hovory'],
                ] as Array<[RequestSource, string]>).map(([source, label]) => (
                  <span key={source} className="rounded-full bg-[#f3f4f6] px-4 py-2 text-xs font-bold text-gray-500">
                    {label} {sourceCounts[source]}
                  </span>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] bg-white">
              <div className="flex items-center justify-between px-7 pb-4 pt-7 sm:px-9 sm:pt-9">
                <h2 className="text-xl font-extrabold tracking-tight text-[#111827]">Vyžaduje pozornosť</h2>
                <span className="text-sm font-bold text-gray-400">{alertCenterItems.length}</span>
              </div>

                <div className="divide-y divide-gray-100">
                  {alertCenterItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Zatiaľ tu nie sú žiadne rizikové incidenty. Nové medium/high nálezy sa zobrazia priamo tu.
                    </div>
                  ) : (
                    alertCenterItems.map((request) => (
                      <Link
                        key={request.id}
                        href={getReportHref(request.id)}
                        className="group block px-7 py-5 transition-colors hover:bg-[#f8f8f8] sm:px-9"
                      >
                        <div className="grid grid-cols-[10px_1fr_auto] items-start gap-4">
                          <span className={`mt-2 h-2.5 w-2.5 rounded-full ${request.risk_level === 'high' ? 'bg-[#ff4f00]' : 'bg-amber-400'}`} />
                          <div className="min-w-0">
                            <p className="text-base font-extrabold leading-6 text-[#111827]">
                              {summarizeRequest(request)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-gray-400">
                              <span>{request.source}</span>
                              <span>{formatDate(request.created_at)}</span>
                              <span className="truncate">{request.submitted_by}</span>
                            </div>
                          </div>
                          <span className="font-mono text-lg text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[#ff4f00]">→</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
            </section>

            <div className="overflow-hidden rounded-[28px] bg-white">
              <div className="px-7 pb-4 pt-7 sm:px-9 sm:pt-9">
                <h2 className="text-xl font-extrabold tracking-tight text-[#111827]">Posledné analýzy</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {requests.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                      <Plus className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Začnite prvou analýzou</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-gray-500">
                      Vložte podozrivý e-mail, SMS, link alebo screenshot. Výsledok sa potom zobrazí v tejto histórii.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <Link
                        href="/submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                      >
                        Spustiť prvú analýzu
                        <Plus className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/link-check"
                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-slate-50"
                      >
                        Overiť link
                      </Link>
                      <Link
                        href="/inboxes"
                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-slate-50"
                      >
                        Pridať inbox
                      </Link>
                    </div>
                  </div>
                ) : (
                  requests.map(req => {
                    const isHigh = req.risk_level === 'high'
                    const isMedium = req.risk_level === 'medium'
                    const dateStr = formatDate(req.created_at)

                    return (
                      <Link
                        key={req.id}
                        href={getReportHref(req.id)}
                        className="block p-6 transition-colors hover:bg-slate-50"
                      >
                        <div className="grid grid-cols-[10px_1fr_auto] items-start gap-4">
                          <span className={`mt-2 h-2.5 w-2.5 rounded-full ${isHigh ? 'bg-[#ff4f00]' : isMedium ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          <div className="min-w-0">
                            <p className="max-w-2xl truncate text-[15px] font-extrabold text-gray-900">
                              {summarizeRequest(req)}
                            </p>
                            <div className="mt-2 flex gap-4 text-xs font-semibold text-gray-400">
                              <span>{req.source}</span>
                              <span>{dateStr}</span>
                              <span className="truncate">{req.submitted_by}</span>
                              {req.phone_from && <span className="truncate">číslo: {req.phone_from}</span>}
                            </div>
                          </div>
                          <span className="text-gray-300">→</span>
                        </div>
                      </Link>
                    ) 
                  })
                )}
              </div>
            </div>

          </div>
      </div>
    </div>
  )
}
