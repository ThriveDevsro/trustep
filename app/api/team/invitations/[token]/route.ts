import { NextRequest, NextResponse } from 'next/server'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const user = await getRequestAppUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Pozvánky nie sú nakonfigurované.' }, { status: 503 })
  const { data: invitation } = await supabase.from('company_members').select('id,email').eq('invite_token', params.token).eq('status', 'invited').maybeSingle()
  if (!invitation || invitation.email.toLowerCase() !== user.email.toLowerCase()) return NextResponse.json({ error: 'Táto pozvánka nepatrí k vášmu e-mailu alebo už nie je platná.' }, { status: 403 })
  const { error } = await supabase.from('company_members').update({ status: 'active', user_id: user.id }).eq('id', invitation.id)
  if (error) return NextResponse.json({ error: 'Pozvánku sa nepodarilo prijať.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
