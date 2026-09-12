'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { getAppAuthHeaders } from '@/lib/app-auth'
import type { AnalysisFeedback as Feedback } from '@/lib/types'

export function AnalysisFeedback({ requestId, initialFeedback }: { requestId: string; initialFeedback?: Feedback | null }) {
  const [feedback, setFeedback] = useState<Feedback | null>(initialFeedback ?? null)
  const [saving, setSaving] = useState(false)
  async function choose(next: Feedback) {
    setSaving(true)
    try {
      const response = await fetch('/api/analysis-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...await getAppAuthHeaders() }, body: JSON.stringify({ requestId, feedback: next }) })
      if (response.ok) setFeedback(next)
    } finally { setSaving(false) }
  }
  return <div className="pt-6 border-t border-slate-100"><h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Spätná väzba</h3><p className="mt-2 text-xs leading-5 text-slate-500">Pomôžte tímu rozlíšiť potvrdené podvody od falošných poplachov.</p>{feedback ? <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {feedback === 'confirmed_fraud' ? 'Označené ako potvrdený podvod.' : 'Označené ako falošný poplach.'}</p> : <div className="mt-3 grid gap-2"><button disabled={saving} onClick={() => choose('confirmed_fraud')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-bold text-red-700 disabled:opacity-50">Potvrdený podvod</button><button disabled={saving} onClick={() => choose('false_positive')} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-bold text-slate-600 disabled:opacity-50">Falošný poplach</button>{saving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}</div>}</div>
}
