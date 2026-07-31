import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const OAUTH_STATE_COOKIE = 'truststep_google_inbox_oauth'

type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  scope?: string
  expires_in?: number
  token_type?: string
  id_token?: string
}

type GoogleUserInfo = {
  sub: string
  email: string
  email_verified?: boolean
}

function getGoogleOauthConfig() {
  const clientId = process.env.GOOGLE_MAIL_CLIENT_ID
  const clientSecret = process.env.GOOGLE_MAIL_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (
    !clientId || clientId === 'your_google_mail_client_id' ||
    !clientSecret || clientSecret === 'your_google_mail_client_secret' ||
    !appUrl
  ) {
    return null
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/inboxes/oauth/google/callback`,
  }
}

function readOauthCookie(req: NextRequest) {
  const rawValue = req.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue) as { state: string; inboxId: string; createdAt: number }
    if (!parsed.state || !parsed.inboxId) return null
    return parsed
  } catch {
    return null
  }
}

async function exchangeGoogleCode(code: string, config: NonNullable<ReturnType<typeof getGoogleOauthConfig>>) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const payload = await response.json() as GoogleTokenResponse & { error?: string; error_description?: string }
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Google token exchange zlyhal.')
  }

  return payload
}

async function fetchGoogleUser(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const payload = await response.json() as GoogleUserInfo & { error?: string; error_description?: string }
  if (!response.ok || !payload.email || !payload.sub) {
    throw new Error(payload.error_description || payload.error || 'Nepodarilo sa načítať Google profil.')
  }

  return payload
}

export async function GET(req: NextRequest) {
  const cleanupRedirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url))
    response.cookies.set(OAUTH_STATE_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })
    return response
  }

  try {
    const code = req.nextUrl.searchParams.get('code')?.trim()
    const state = req.nextUrl.searchParams.get('state')?.trim()
    const errorParam = req.nextUrl.searchParams.get('error')?.trim()
    const oauthCookie = readOauthCookie(req)
    const oauthConfig = getGoogleOauthConfig()

    if (errorParam) {
      return cleanupRedirect(`/inboxes?oauth_error=${encodeURIComponent(errorParam)}`)
    }

    if (!code || !state || !oauthCookie || oauthCookie.state !== state) {
      return cleanupRedirect('/inboxes?oauth_error=invalid_state')
    }

    if (!oauthConfig) {
      return cleanupRedirect('/inboxes?oauth_error=missing_google_config')
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return cleanupRedirect('/inboxes?oauth_error=missing_supabase')
    }

    const tokenData = await exchangeGoogleCode(code, oauthConfig)
    const googleUser = await fetchGoogleUser(tokenData.access_token)

    const { error } = await supabase
      .from('connected_inboxes')
      .update({
        status: 'connected',
        oauth_access_token: tokenData.access_token,
        oauth_refresh_token: tokenData.refresh_token || null,
        oauth_scope: tokenData.scope || null,
        oauth_token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        oauth_external_email: googleUser.email,
        oauth_subject: googleUser.sub,
        email_address: googleUser.email,
        last_checked_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', oauthCookie.inboxId)

    if (error) {
      throw error
    }

    return cleanupRedirect('/inboxes?oauth=connected&provider=gmail')
  } catch (error) {
    console.error('[google-oauth-callback]', error)

    const oauthCookie = readOauthCookie(req)
    const supabase = createServiceClient()
    if (oauthCookie?.inboxId && supabase) {
      await supabase
        .from('connected_inboxes')
        .update({
          status: 'error',
          last_error: error instanceof Error ? error.message : 'Google OAuth zlyhal.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', oauthCookie.inboxId)
    }

    return cleanupRedirect('/inboxes?oauth_error=callback_failed')
  }
}
