import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const OAUTH_STATE_COOKIE = 'truststep_outlook_inbox_oauth'
const MICROSOFT_OAUTH_SCOPE = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/User.Read',
].join(' ')

function getMicrosoftOauthConfig() {
  const clientId = process.env.MICROSOFT_MAIL_CLIENT_ID
  const tenantId = process.env.MICROSOFT_MAIL_TENANT_ID || 'common'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || clientId === 'your_microsoft_mail_client_id' || !appUrl) {
    return null
  }

  return {
    clientId,
    tenantId,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/inboxes/oauth/outlook/callback`,
  }
}

export async function GET(req: NextRequest) {
  try {
    const inboxId = req.nextUrl.searchParams.get('inboxId')?.trim()
    if (!inboxId) {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=missing_inbox&provider=outlook', req.url))
    }

    const oauthConfig = getMicrosoftOauthConfig()
    if (!oauthConfig) {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=missing_microsoft_config&provider=outlook', req.url))
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=missing_supabase&provider=outlook', req.url))
    }

    const { data: inbox, error } = await supabase
      .from('connected_inboxes')
      .select('id, provider, status')
      .eq('id', inboxId)
      .single()

    if (error || !inbox || inbox.provider !== 'outlook') {
      return NextResponse.redirect(new URL('/inboxes?oauth_error=inbox_not_found&provider=outlook', req.url))
    }

    const state = crypto.randomUUID()
    const authorizeUrl = new URL(`https://login.microsoftonline.com/${oauthConfig.tenantId}/oauth2/v2.0/authorize`)
    authorizeUrl.searchParams.set('client_id', oauthConfig.clientId)
    authorizeUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('response_mode', 'query')
    authorizeUrl.searchParams.set('scope', MICROSOFT_OAUTH_SCOPE)
    authorizeUrl.searchParams.set('state', state)
    authorizeUrl.searchParams.set('prompt', 'select_account')

    const response = NextResponse.redirect(authorizeUrl)
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
    console.error('[outlook-oauth-start]', error)
    return NextResponse.redirect(new URL('/inboxes?oauth_error=start_failed&provider=outlook', req.url))
  }
}
