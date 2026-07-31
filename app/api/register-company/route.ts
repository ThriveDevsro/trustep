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
    const { userId, companyName, approverEmail } = await req.json()

    if (!userId || !approverEmail) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase service client is not configured' }, { status: 503 })
    }

    const { error } = await supabase.from('companies').upsert(
      {
        id: userId,
        name: String(companyName || '').trim() || deriveAccountName(approverEmail),
        approver_email: approverEmail,
      },
      { onConflict: 'id' }
    )

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Register company error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
