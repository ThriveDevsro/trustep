import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getRequestAppUser } from '@/lib/server-auth'

function deriveAccountName(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || ''

  if (!domain) return 'FeelsOdd účet'

  const personalDomains = new Set(['gmail.com', 'icloud.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'zoznam.sk', 'centrum.sk'])
  if (personalDomains.has(domain)) return 'Firemný účet'

  const base = domain.split('.')[0]
  if (!base) return 'FeelsOdd účet'

  return base
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function POST(req: NextRequest) {
  try {
    const { companyName } = await req.json()
    const user = await getRequestAppUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase service client is not configured' }, { status: 503 })
    }

    const { error } = await supabase.from('companies').upsert(
      {
        id: user.id,
        name: String(companyName || '').trim() || deriveAccountName(user.email),
        approver_email: user.email,
        account_type: 'business',
      },
      { onConflict: 'id' }
    )

    if (error) {
      throw error
    }

    // If this e-mail was invited to a business workspace, activating its own
    // account also accepts that invitation. The workspace resolver then uses
    // the company workspace instead of the user's personal workspace.
    await supabase
      .from('company_members')
      .update({ user_id: user.id, status: 'active' })
      .eq('email', user.email.toLowerCase())
      .eq('status', 'invited')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Register company error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
