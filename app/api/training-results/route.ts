import { NextRequest, NextResponse } from 'next/server'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const user = await getRequestAppUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as Record<string, unknown>
  const score = Number(body.score)
  const totalScenarios = Number(body.totalScenarios)
  if (!Number.isInteger(score) || score < 0 || score > 100 || !Number.isInteger(totalScenarios) || totalScenarios < 1 || totalScenarios > 5) return NextResponse.json({ error: 'Invalid training result' }, { status: 400 })
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Ukladanie tréningu nie je nakonfigurované.' }, { status: 503 })
  const { error } = await supabase.from('training_results').insert({ company_id: user.id, mode: body.mode === 'daily' ? 'daily' : 'full', score, caught_signals: Number(body.caughtSignals) || 0, total_signals: Number(body.totalSignals) || 0, safe_actions: Number(body.safeActions) || 0, total_scenarios: totalScenarios })
  if (error) return NextResponse.json({ error: 'Výsledok sa nepodarilo uložiť.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
