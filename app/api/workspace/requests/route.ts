import { NextRequest, NextResponse } from 'next/server'
import { getAccountUsage } from '@/lib/analysis-access'
import { createServiceClient } from '@/lib/supabase'
import { listDevRequestsByCompany } from '@/lib/dev-requests-store'

export async function GET(req: NextRequest) {
  const result = await getAccountUsage(req)
  if (result.response || !result.access || result.access.isGuest) return result.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ requests: await listDevRequestsByCompany(result.access.companyId) })
  const { data, error } = await supabase.from('requests').select('*').eq('company_id', result.access.companyId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Históriu sa nepodarilo načítať.' }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}
