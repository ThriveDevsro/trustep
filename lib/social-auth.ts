'use client'

import { getSupabase } from '@/lib/supabase'

export type SocialAuthProvider = 'google' | 'azure'

function getSafeNextPath(nextPath: string) {
  return nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'
}

export async function startSocialAuth(provider: SocialAuthProvider, nextPath: string) {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Sociálne prihlásenie zatiaľ nie je nakonfigurované.')
  }

  const callbackUrl = new URL('/auth/callback', window.location.origin)
  callbackUrl.searchParams.set('next', getSafeNextPath(nextPath))

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: provider === 'azure' ? 'email' : undefined,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error) throw error
}
