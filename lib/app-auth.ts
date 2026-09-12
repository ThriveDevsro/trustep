import { getSupabase } from '@/lib/supabase'

export interface AppUser {
  id: string
  email: string
  provider: 'supabase' | 'local'
}

export function isSupabaseAuthAvailable() {
  return getSupabase() !== null
}

export function deriveAccountNameFromEmail(email: string): string {
  const domain = email.trim().toLowerCase().split('@')[1] || ''

  if (!domain) return 'FeelsOdd účet'

  const personalDomains = new Set([
    'gmail.com',
    'icloud.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'zoznam.sk',
    'centrum.sk',
  ])

  if (personalDomains.has(domain)) return 'Firemný účet'

  const base = domain.split('.')[0]
  if (!base) return 'FeelsOdd účet'

  return base
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || 'Auth request failed.')
  }
  return payload as T
}

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user?.id || !data.user.email) return null

    return {
      id: data.user.id,
      email: data.user.email,
      provider: 'supabase',
    }
  }

  const payload = await fetchJson<{ user: AppUser | null }>('/api/auth/me')
  return payload.user
}

export async function registerWithLocalAuth(email: string, password: string): Promise<AppUser> {
  const payload = await fetchJson<{ user: AppUser }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  return payload.user
}

export async function signInWithLocalAuth(email: string, password: string): Promise<AppUser> {
  const payload = await fetchJson<{ user: AppUser }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  return payload.user
}

export async function signOutAppUser(): Promise<void> {
  const supabase = getSupabase()
  if (supabase) {
    await supabase.auth.signOut()
    return
  }

  await fetchJson<{ success: true }>('/api/auth/logout', {
    method: 'POST',
  })
}

export async function getAppAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase()
  if (!supabase) return {}

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}
