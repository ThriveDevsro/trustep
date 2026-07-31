import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const OAUTH_STATE_COOKIE = 'truststep_google_inbox_oauth'
const GOOGLE_OAUTH_SCOPE = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

function getGoogleOauthConfig() {
  const clientId = process.env.GOOGLE_MAIL_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || clientId === 'your_google_mail_client_id' || !appUrl) {
    return null
  }

  return {
    clientId,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/inboxes/oauth/google/callback`,
  }
}

export async function GET(req: NextRequest) {
  try {
    const inboxId = req.nextUrl.searchParams.get('inboxId')?.trim()
    if (!inboxId) {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=missing_inbox', req.url))
    }

    const oauthConfig = getGoogleOauthConfig()
    if (!oauthConfig) {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=missing_google_config', req.url))
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=missing_supabase', req.url))
    }

    const { data: inbox, error } = await supabase
      .from('connected_inboxes')
      .select('id, provider, status')
      .eq('id', inboxId)
      .single()

    if (error || !inbox || inbox.provider !== 'gmail') {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=inbox_not_found', req.url))
    }

    const state = crypto.randomUUID()
    const callbackTarget = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    callbackTarget.searchParams.set('client_id', oauthConfig.clientId)
    callbackTarget.searchParams.set('redirect_uri', oauthConfig.redirectUri)
    callbackTarget.searchParams.set('response_type', 'code')
    callbackTarget.searchParams.set('scope', GOOGLE_OAUTH_SCOPE)
    callbackTarget.searchParams.set('access_type', 'offline')
    callbackTarget.searchParams.set('prompt', 'consent')
    callbackTarget.searchParams.set('include_granted_scopes', 'true')
    callbackTarget.searchParams.set('state', state)

    const response = NextResponse.redirect(callbackTarget)
    response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({
      state,
      inboxId,
      createdAt: Date.now(),
    }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    })

    return response
  } catch (error) {
    console.error('[google-oauth-start]', error)
    return NextResponse.redirect(new URL('/inboxes?oauth_error=start_failed', req.url))
  }
}
