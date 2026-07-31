'use client'

import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnalysisInsights } from '@/components/AnalysisInsights'
import { SourceBadge } from '@/components/SourceBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { deriveAccountNameFromEmail } from '@/lib/app-auth'
import { getLocalRequestById } from '@/lib/local-history'
import type { Request } from '@/lib/types'
import { Clock, User, Calendar, Building2, Hash } from 'lucide-react'

type RequestDetail = {
  icon: JSX.Element
  label: string
  value: string | JSX.Element
}

export default function LocalReportPage() {
  const params = useParams<{ id: string }>()
  const [request, setRequest] = useState<Request | null | undefined>(undefined)

  useEffect(() => {
    if (!params?.id) {
      setRequest(null)
      return
    }

    setRequest(getLocalRequestById(params.id))
  }, [params])

  if (request === undefined) {
    return (
      <div className="min-h-screen bg-navy-800 flex items-center justify-center text-white/70">
        Načítavam lokálny report...
      </div>
    )
  }

  if (!request) {
    notFound()
  }

  const formattedDate = new Date(request.created_at).toLocaleString('sk-SK', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const details: RequestDetail[] = [
    { icon: <User className="w-4 h-4" />, label: 'Odosielateľ', value: request.submitted_by },
    { icon: <Building2 className="w-4 h-4" />, label: 'Zdroj', value: <SourceBadge source={request.source} /> },
    { icon: <Calendar className="w-4 h-4" />, label: 'Dátum', value: formattedDate },
    { icon: <Clock className="w-4 h-4" />, label: 'Stav', value: <StatusBadge status={request.status} /> },
    ...(request.phone_from ? [{ icon: <Hash className="w-4 h-4" />, label: 'Telefón', value: request.phone_from }] : []),
    { icon: <Building2 className="w-4 h-4" />, label: 'Účet', value: deriveAccountNameFromEmail(request.submitted_by) },
  ]

  return (
    <div className="min-h-screen bg-navy-800">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/70 transition-colors mb-2 inline-block">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Lokálna správa o riziku</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SourceBadge source={request.source} />
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <AnalysisInsights
            riskLevel={request.risk_level}
            reasons={request.reasons ?? []}
            recommendation={request.recommendation}
            tone="dark"
          />
        </div>

        <div className="bg-navy-700/40 border border-white/5 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Analyzovaný text</h2>
          <pre className="text-sm text-white/60 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
            {request.text}
          </pre>
        </div>

        <div className="bg-navy-700/40 border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Detaily žiadosti</h2>
          <dl className="space-y-3">
            {details.map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="text-white/30">{icon}</span>
                <span className="text-white/40 w-28">{label}</span>
                <span className="text-white/80">{value}</span>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  )
}
