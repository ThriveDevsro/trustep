import { createServiceClient } from '@/lib/supabase'
import { sendDailyDigestEmail } from '@/lib/resend'
import type { RequestSource, RiskLevel } from '@/lib/types'

type DigestRequest = {
  id: string
  source: RequestSource
  risk_level: RiskLevel
  submitted_by: string
  created_at: string
}

type DigestInbox = {
  email_address: string
  display_name?: string | null
  status: 'pending' | 'connected' | 'paused' | 'error'
  last_error?: string | null
}

type DigestAlert = {
  status: 'sent' | 'failed'
}

export async function sendDailyDigestForCompany(companyId: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || resendKey === 'your_resend_api_key') {
    throw new Error('RESEND_API_KEY nie je nakonfigurovaný.')
  }

  const supabase = createServiceClient()
  if (!supabase) {
    throw new Error('Supabase nie je nakonfigurovaný.')
  }

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()

  const [{ data: company, error: companyError }, requestsResponse, inboxesResponse, alertsResponse] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, approver_email')
      .eq('id', companyId)
      .single(),
    supabase
      .from('requests')
      .select('id, source, risk_level, submitted_by, created_at')
      .eq('company_id', companyId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('connected_inboxes')
      .select('email_address, display_name, status, last_error')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('alert_deliveries')
      .select('status')
      .eq('company_id', companyId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (companyError || !company) {
    throw new Error('Firma sa nenašla.')
  }
  if (requestsResponse.error) throw requestsResponse.error
  if (inboxesResponse.error) throw inboxesResponse.error
  if (alertsResponse.error) throw alertsResponse.error

  const requests = (requestsResponse.data ?? []) as DigestRequest[]
  const inboxes = (inboxesResponse.data ?? []) as DigestInbox[]
  const alerts = (alertsResponse.data ?? []) as DigestAlert[]

  const incidents = requests.filter((request) => request.risk_level === 'high' || request.risk_level === 'medium')
  const highIncidents = incidents.filter((request) => request.risk_level === 'high')
  const mediumIncidents = incidents.filter((request) => request.risk_level === 'medium')
  const failedAlerts = alerts.filter((alert) => alert.status === 'failed').length
  const inboxErrors = inboxes.filter((inbox) => inbox.status === 'error').length

  const sourceCounts = incidents.reduce<Record<RequestSource, number>>((accumulator, request) => {
    accumulator[request.source] = (accumulator[request.source] || 0) + 1
    return accumulator
  }, { web: 0, email: 0, sms: 0, call: 0, image: 0 })

  const sourceLabels: Record<RequestSource, string> = {
    email: 'E-mail',
    web: 'Web',
    sms: 'SMS',
    call: 'Hovor',
    image: 'Screenshot',
  }

  const sourceLines = Object.entries(sourceCounts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([source, count]) => `${sourceLabels[source as RequestSource]}: ${count}`)

  const topIncidentLines = incidents
    .slice(0, 5)
    .map((request) => {
      const riskLabel = request.risk_level === 'high' ? 'HIGH' : 'MEDIUM'
      const sourceLabel = sourceLabels[request.source]
      return `${riskLabel} • ${sourceLabel} • ${request.submitted_by} • ${new Date(request.created_at).toLocaleString('sk-SK', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    })

  const inboxLines = inboxes.slice(0, 6).map((inbox) => {
    const name = inbox.display_name || inbox.email_address
    if (inbox.status === 'error') {
      return `${name}: chyba syncu${inbox.last_error ? ` (${inbox.last_error})` : ''}`
    }
    if (inbox.status === 'paused') {
      return `${name}: pozastavené`
    }
    if (inbox.status === 'pending') {
      return `${name}: čaká na dokončenie`
    }
    return `${name}: pripojené`
  })

  await sendDailyDigestEmail({
    to: company.approver_email,
    companyName: company.name,
    summary: {
      totalIncidents24h: incidents.length,
      highIncidents24h: highIncidents.length,
      mediumIncidents24h: mediumIncidents.length,
      failedAlerts24h: failedAlerts,
      inboxErrors,
      sourceLines,
      topIncidentLines,
      inboxLines,
    },
  })

  return {
    companyId: company.id,
    companyName: company.name,
    approverEmail: company.approver_email,
    summary: {
      totalIncidents24h: incidents.length,
      highIncidents24h: highIncidents.length,
      mediumIncidents24h: mediumIncidents.length,
      failedAlerts24h: failedAlerts,
      inboxErrors,
    },
  }
}

export async function sendDailyDigestsForAllCompanies() {
  const supabase = createServiceClient()
  if (!supabase) {
    throw new Error('Supabase nie je nakonfigurovaný.')
  }

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id')
    .order('created_at', { ascending: false })

  if (error) throw error

  const results: Array<{
    companyId: string
    status: 'sent' | 'failed'
    approverEmail?: string
    companyName?: string
    error?: string
  }> = []

  for (const company of companies ?? []) {
    try {
      const result = await sendDailyDigestForCompany(company.id)
      results.push({
        companyId: company.id,
        status: 'sent',
        approverEmail: result.approverEmail,
        companyName: result.companyName,
      })
    } catch (error) {
      results.push({
        companyId: company.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Digest zlyhal.',
      })
    }
  }

  return results
}
