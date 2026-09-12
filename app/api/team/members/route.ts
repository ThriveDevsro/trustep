import { NextRequest, NextResponse } from 'next/server'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'
import { randomUUID } from 'node:crypto'
import { sendTeamInviteEmail } from '@/lib/resend'

async function getBusinessOwner(req: NextRequest) {
  const user = await getRequestAppUser(req)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const supabase = createServiceClient()
  if (!supabase) return { error: NextResponse.json({ error: 'Správa tímu nie je nakonfigurovaná.' }, { status: 503 }) }
  const { data: company } = await supabase.from('companies').select('id, name, account_type').eq('id', user.id).maybeSingle()
  if (!company || company.account_type !== 'business') return { error: NextResponse.json({ error: 'Táto funkcia je dostupná iba pre firemný účet.' }, { status: 403 }) }
  return { user, supabase, company }
}

export async function GET(req: NextRequest) {
  const result = await getBusinessOwner(req)
  if (result.error) return result.error
  const { data, error } = await result.supabase!.from('company_members').select('id,email,role,status,created_at').eq('company_id', result.company!.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Členov sa nepodarilo načítať.' }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(req: NextRequest) {
  const result = await getBusinessOwner(req)
  if (result.error) return result.error
  const { email, role } = await req.json() as { email?: string; role?: string }
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !['admin', 'member'].includes(String(role))) return NextResponse.json({ error: 'Zadajte platný e-mail a rolu.' }, { status: 400 })
  const inviteToken = randomUUID()
  const { error } = await result.supabase!.from('company_members').upsert({ company_id: result.company!.id, email: normalizedEmail, role, status: 'invited', invite_token: inviteToken }, { onConflict: 'company_id,email' })
  if (error) return NextResponse.json({ error: 'Pozvánku sa nepodarilo vytvoriť.' }, { status: 500 })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  let emailSent = false
  if (appUrl) {
    try { await sendTeamInviteEmail({ to: normalizedEmail, companyName: result.company!.name, role: role as 'admin' | 'member', inviteUrl: `${appUrl}/prijmout-pozvanku/${inviteToken}` }); emailSent = true } catch { /* invitation remains available for a later resend */ }
  }
  return NextResponse.json({ ok: true, emailSent })
}
