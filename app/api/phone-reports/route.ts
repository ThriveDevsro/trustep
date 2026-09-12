import { NextRequest, NextResponse } from 'next/server'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'
import { enforceAnalysisRateLimit } from '@/lib/rate-limit'

function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '')
  const withPrefix = compact.startsWith('00') ? `+${compact.slice(2)}` : compact
  return /^\+[1-9]\d{6,14}$/.test(withPrefix) ? withPrefix : null
}

export async function POST(req: NextRequest) {
  const limited = enforceAnalysisRateLimit(req, 'phone-report')
  if (limited) return limited

  const user = await getRequestAppUser(req)
  if (!user) return NextResponse.json({ error: 'Pre nahlásenie čísla sa prihláste.' }, { status: 401 })

  const { phone, category, notes } = await req.json() as { phone?: string; category?: string; notes?: string }
  const normalized = normalizePhone(phone ?? '')
  if (!normalized) return NextResponse.json({ error: 'Neplatné telefónne číslo.' }, { status: 400 })
  if (category && !['suspected_scam', 'fraud_confirmed', 'spam'].includes(category)) return NextResponse.json({ error: 'Neplatná kategória hlásenia.' }, { status: 400 })

  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Nahlasovanie čísiel zatiaľ nie je v tomto prostredí dostupné.' }, { status: 503 })

  const { error } = await supabase.from('phone_reports').upsert({
    phone_e164: normalized,
    user_id: user.id,
    category: category ?? 'suspected_scam',
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) || null : null,
  }, { onConflict: 'phone_e164,user_id' })
  if (error) return NextResponse.json({ error: 'Číslo sa nepodarilo nahlásiť.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
