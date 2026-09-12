import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getRequestAppUser } from '@/lib/server-auth'

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

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestAppUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { inboxId: rawInboxId } = await req.json()
    const inboxId = String(rawInboxId || '').trim()
    if (!inboxId) {
      return NextResponse.json({ error: 'Chýba inbox.' }, { status: 400 })
    }

    const oauthConfig = getGoogleOauthConfig()
    if (!oauthConfig) {
      return NextResponse.json({ error: 'Google pripojenie nie je nakonfigurované.' }, { status: 503 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Databáza nie je nakonfigurovaná.' }, { status: 503 })
    }

    const { data: inbox, error } = await supabase
      .from('connected_inboxes')
      .select('id, provider, status, company_id')
      .eq('id', inboxId)
      .eq('company_id', user.id)
      .single()

    if (error || !inbox || inbox.provider !== 'gmail') {
      return NextResponse.json({ error: 'Schránka sa nenašla.' }, { status: 404 })
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

    const response = NextResponse.json({ authorizeUrl: callbackTarget.toString() })
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
    return NextResponse.json({ error: 'Google pripojenie sa nepodarilo spustiť.' }, { status: 500 })
  }
}
