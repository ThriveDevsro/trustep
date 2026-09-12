import { NextRequest, NextResponse } from 'next/server'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const user = await getRequestAppUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { requestId, feedback } = await req.json() as { requestId?: string; feedback?: 'confirmed_fraud' | 'false_positive' }
  if (!requestId || !['confirmed_fraud', 'false_positive'].includes(feedback ?? '')) return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 })
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Ukladanie spätnej väzby nie je nakonfigurované.' }, { status: 503 })
  const { data, error } = await supabase.from('requests').update({ feedback }).eq('id', requestId).eq('company_id', user.id).select('id').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Spätnú väzbu sa nepodarilo uložiť.' }, { status: 500 })
  return NextResponse.json({ ok: true, feedback })
}
