import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { clearDevSession, getDevSessionCookieName } from '@/lib/dev-auth-store'
import { getRequestSessionToken } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = getRequestSessionToken(req) || cookieStore.get(getDevSessionCookieName())?.value
  if (token) {
    await clearDevSession(token)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(getDevSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  })
  return response
}
