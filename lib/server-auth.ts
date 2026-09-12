import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import type { AppUser } from '@/lib/app-auth'
import { getDevSessionCookieName, getDevUserBySessionToken } from '@/lib/dev-auth-store'
import { createServiceClient } from '@/lib/supabase'

export function getRequestSessionToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return ''
  return authHeader.slice(7).trim()
}

export async function getRequestAppUser(req: NextRequest): Promise<AppUser | null> {
  const bearerToken = getRequestSessionToken(req)
  if (bearerToken) {
    const supabase = createServiceClient()
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(bearerToken)
      if (!error && data.user?.id && data.user.email) {
        return { id: data.user.id, email: data.user.email, provider: 'supabase' }
      }
    }

    return getDevUserBySessionToken(bearerToken)
  }

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(getDevSessionCookieName())?.value
  return getDevUserBySessionToken(cookieToken)
}
