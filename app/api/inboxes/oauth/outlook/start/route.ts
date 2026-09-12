import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getRequestAppUser } from '@/lib/server-auth'

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

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestAppUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { inboxId: rawInboxId } = await req.json()
    const inboxId = String(rawInboxId || '').trim()
    if (!inboxId) {
      return NextResponse.json({ error: 'Chýba inbox.' }, { status: 400 })
    }

    const oauthConfig = getMicrosoftOauthConfig()
    if (!oauthConfig) {
      return NextResponse.json({ error: 'Microsoft pripojenie nie je nakonfigurované.' }, { status: 503 })
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

    if (error || !inbox || inbox.provider !== 'outlook') {
      return NextResponse.json({ error: 'Schránka sa nenašla.' }, { status: 404 })
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

    const response = NextResponse.json({ authorizeUrl: authorizeUrl.toString() })
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
    return NextResponse.json({ error: 'Microsoft pripojenie sa nepodarilo spustiť.' }, { status: 500 })
  }
}
