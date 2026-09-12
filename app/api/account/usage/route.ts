import { NextRequest, NextResponse } from 'next/server'
import { getAccountUsage } from '@/lib/analysis-access'

export async function GET(req: NextRequest) {
  const result = await getAccountUsage(req)
  if (result.response) return result.response
  if (!result.access || result.access.isGuest) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan, used, limit } = result.access
  return NextResponse.json({ plan, used, limit })
}
