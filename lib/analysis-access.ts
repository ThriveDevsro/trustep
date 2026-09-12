import { NextRequest, NextResponse } from 'next/server'
import { countDevRequestsThisMonth } from '@/lib/dev-requests-store'
import { getRequestAppUser } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase'

export type AccountPlan = 'free' | 'plus' | 'team'

export const PLAN_LIMITS: Record<AccountPlan, number> = {
  free: 10,
  plus: 100,
  team: 1000,
}

export type AnalysisAccess = {
  companyId: string
  submittedBy: string
  isGuest: boolean
  plan: AccountPlan | 'guest'
  used: number
  limit: number
}

function normalizePlan(value: unknown): AccountPlan {
  return value === 'plus' || value === 'team' ? value : 'free'
}

export async function resolveAnalysisAccess(
  req: NextRequest,
  claimedCompanyId?: string,
  options: { enforceLimit?: boolean } = {},
): Promise<{ access?: AnalysisAccess; response?: NextResponse }> {
  const user = await getRequestAppUser(req)

  if (!user) {
    return {
      response: NextResponse.json({ error: 'Pre overenie sa prihláste alebo si vytvorte firemný účet.' }, { status: 401 }),
    }
  }

  if (claimedCompanyId && claimedCompanyId !== user.id) {
    return { response: NextResponse.json({ error: 'K tomuto účtu nemáte prístup.' }, { status: 403 }) }
  }

  const supabase = createServiceClient()
  let plan: AccountPlan = 'free'
  let used = 0
  let workspaceId = user.id

  if (supabase) {
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    workspaceId = membership?.company_id ?? user.id
    const [{ data: company }, { count, error: countError }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', workspaceId).maybeSingle(),
      supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', workspaceId)
        .gte('created_at', new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()),
    ])

    if (countError) {
      return { response: NextResponse.json({ error: 'Limit účtu sa nepodarilo overiť.' }, { status: 503 }) }
    }

    plan = normalizePlan((company as { plan?: unknown } | null)?.plan)
    used = count ?? 0
  } else {
    // Local development has no persistent billing backend. Keep the complete
    // product flow testable without artificial Free-plan rate limits.
    if (process.env.NODE_ENV === 'development') plan = 'team'
    used = await countDevRequestsThisMonth(user.id)
  }

  const limit = PLAN_LIMITS[plan]
  if (options.enforceLimit !== false && used >= limit) {
    return {
      response: NextResponse.json(
        { error: `Dosiahli ste mesačný limit plánu ${plan === 'free' ? 'Free' : plan === 'plus' ? 'Plus' : 'Team'}.`, code: 'PLAN_LIMIT_REACHED', plan, used, limit },
        { status: 429 },
      ),
    }
  }

  return {
    access: { companyId: workspaceId, submittedBy: user.email, isGuest: false, plan, used, limit },
  }
}

export async function getAccountUsage(req: NextRequest) {
  const result = await resolveAnalysisAccess(req, undefined, { enforceLimit: false })
  if (result.response) return result
  return result
}
