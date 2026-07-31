import { NextRequest, NextResponse } from 'next/server'
import { authenticateDevUser, createDevSession, getDevSessionCookieName } from '@/lib/dev-auth-store'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const user = await authenticateDevUser(String(email || ''), String(password || ''))
    const sessionToken = await createDevSession(user.id)

    const response = NextResponse.json({ user, sessionToken })
    response.cookies.set(getDevSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    })
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Prihlásenie zlyhalo.' },
      { status: 401 }
    )
  }
}
