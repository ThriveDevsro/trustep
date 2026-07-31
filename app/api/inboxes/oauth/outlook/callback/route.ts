import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const OAUTH_STATE_COOKIE = 'truststep_outlook_inbox_oauth'

type MicrosoftTokenResponse = {
  token_type?: string
  scope?: string
  expires_in?: number
  ext_expires_in?: number
  access_token: string
  refresh_token?: string
  id_token?: string
}

type MicrosoftGraphUser = {
  id: string
  mail?: string | null
  userPrincipalName?: string | null
  displayName?: string | null
}

function getMicrosoftOauthConfig() {
  const clientId = process.env.MICROSOFT_MAIL_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_MAIL_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_MAIL_TENANT_ID || 'common'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (
    !clientId || clientId === 'your_microsoft_mail_client_id' ||
    !clientSecret || clientSecret === 'your_microsoft_mail_client_secret' ||
    !appUrl
  ) {
    return null
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/inboxes/oauth/outlook/callback`,
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

async function exchangeMicrosoftCode(code: string, config: NonNullable<ReturnType<typeof getMicrosoftOauthConfig>>) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const payload = await response.json() as MicrosoftTokenResponse & { error?: string; error_description?: string }
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Microsoft token exchange zlyhal.')
  }

  return payload
}

async function fetchMicrosoftUser(accessToken: string) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName,displayName', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const payload = await response.json() as MicrosoftGraphUser & { error?: { message?: string } }
  const email = payload.mail || payload.userPrincipalName
  if (!response.ok || !payload.id || !email) {
    throw new Error(payload.error?.message || 'Nepodarilo sa načítať Microsoft profil.')
  }

  return {
    id: payload.id,
    email,
    displayName: payload.displayName || null,
  }
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
    const oauthConfig = getMicrosoftOauthConfig()

    if (errorParam) {
      return cleanupRedirect(`/inboxes?oauth_error=${encodeURIComponent(errorParam)}&provider=outlook`)
    }

    if (!code || !state || !oauthCookie || oauthCookie.state !== state) {
      return cleanupRedirect('/inboxes?oauth_error=invalid_state&provider=outlook')
    }

    if (!oauthConfig) {
      return cleanupRedirect('/inboxes?oauth_error=missing_microsoft_config&provider=outlook')
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return cleanupRedirect('/inboxes?oauth_error=missing_supabase&provider=outlook')
    }

    const tokenData = await exchangeMicrosoftCode(code, oauthConfig)
    const microsoftUser = await fetchMicrosoftUser(tokenData.access_token)

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
        oauth_external_email: microsoftUser.email,
        oauth_subject: microsoftUser.id,
        email_address: microsoftUser.email,
        display_name: microsoftUser.displayName,
        last_checked_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', oauthCookie.inboxId)

    if (error) {
      throw error
    }

    return cleanupRedirect('/inboxes?oauth=connected&provider=outlook')
  } catch (error) {
    console.error('[outlook-oauth-callback]', error)

    const oauthCookie = readOauthCookie(req)
    const supabase = createServiceClient()
    if (oauthCookie?.inboxId && supabase) {
      await supabase
        .from('connected_inboxes')
        .update({
          status: 'error',
          last_error: error instanceof Error ? error.message : 'Microsoft OAuth zlyhal.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', oauthCookie.inboxId)
    }

    return cleanupRedirect('/inboxes?oauth_error=callback_failed&provider=outlook')
  }
}
