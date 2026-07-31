import { NextRequest, NextResponse } from 'next/server'
import { getRequestAppUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const user = await getRequestAppUser(req)
  return NextResponse.json({ user })
}
