import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function deriveAccountName(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || ''

  if (!domain) return 'TrustStep účet'

  const personalDomains = new Set(['gmail.com', 'icloud.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'zoznam.sk', 'centrum.sk'])
  if (personalDomains.has(domain)) return 'Osobný účet'

  const base = domain.split('.')[0]
  if (!base) return 'TrustStep účet'

  return base
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase service client is not configured' }, { status: 503 })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: String(fullName || '').trim(),
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'User was not created' }, { status: 500 })
    }

    const { error: companyError } = await supabase.from('companies').upsert(
      {
        id: data.user.id,
        name: String(fullName || '').trim() || deriveAccountName(email),
        approver_email: email,
      },
      { onConflict: 'id' }
    )

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: data.user.id })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
