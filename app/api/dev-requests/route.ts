import { NextRequest, NextResponse } from 'next/server'
import { listDevRequestsByCompany } from '@/lib/dev-requests-store'
import { getRequestAppUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const user = await getRequestAppUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await listDevRequestsByCompany(user.id)
  return NextResponse.json({ requests })
}
