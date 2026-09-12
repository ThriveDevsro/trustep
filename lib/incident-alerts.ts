import { createServiceClient } from '@/lib/supabase'
import type { AlertDeliveryChannel, RequestSource, RiskLevel, RequestStatus } from '@/lib/types'

const RISK_ORDER: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

const SOURCE_LABELS: Record<RequestSource, string> = {
  email: 'E-mail',
  web: 'Web',
  sms: 'SMS',
  call: 'Hovor',
  image: 'Screenshot',
}

function getAlertMinimumRisk(): RiskLevel {
  const configured = String(process.env.INCIDENT_ALERT_MIN_RISK || 'medium').trim().toLowerCase()
  return configured === 'high' ? 'high' : 'medium'
}

function isWebhookConfigured(): boolean {
  const webhookUrl = process.env.INCIDENT_ALERT_WEBHOOK_URL
  return Boolean(webhookUrl && webhookUrl !== 'your_incident_alert_webhook_url')
}

function shouldSendAlert(riskLevel: RiskLevel): boolean {
  return RISK_ORDER[riskLevel] >= RISK_ORDER[getAlertMinimumRisk()]
}

function getWebhookKind(webhookUrl: string): 'slack' | 'teams' {
  return /(office\.com|office365\.com|outlook\.office\.com|logic\.azure\.com)/i.test(webhookUrl)
    ? 'teams'
    : 'slack'
}

function getWebhookDestination(webhookUrl: string): string {
  try {
    return new URL(webhookUrl).host
  } catch {
    return 'unknown'
  }
}

function getRiskLabel(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'high':
      return 'Vysoké'
    case 'medium':
      return 'Stredné'
    default:
      return 'Nízke'
  }
}

function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'high':
      return '#dc2626'
    case 'medium':
      return '#d97706'
    default:
      return '#059669'
  }
}

function trimSnippet(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim()
  return normalized.length > 220 ? `${normalized.slice(0, 220)}...` : normalized
}

export async function maybeSendIncidentAlert({
  requestId,
  companyId,
  companyName,
  submittedBy,
  source,
  riskLevel,
  reasons,
  snippet,
  status = 'pending',
  phoneFrom,
  throwOnError = false,
}: {
  requestId?: string
  companyId?: string
  companyName?: string | null
  submittedBy: string
  source: RequestSource
  riskLevel: RiskLevel
  reasons: string[]
  snippet: string
  status?: RequestStatus
  phoneFrom?: string
  throwOnError?: boolean
}): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!isWebhookConfigured() || !shouldSendAlert(riskLevel)) {
    return {
      sent: false,
      skipped: !isWebhookConfigured()
        ? 'Webhook nie je nakonfigurovaný.'
        : `Alert pre riziko ${riskLevel} je pod minimálnym prahom ${getAlertMinimumRisk()}.`,
    }
  }

  const webhookUrl = process.env.INCIDENT_ALERT_WEBHOOK_URL as string
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const reportUrl = appUrl && requestId ? `${appUrl}/report/${requestId}` : ''
  const riskLabel = getRiskLabel(riskLevel)
  const sourceLabel = SOURCE_LABELS[source]
  const channel = getWebhookKind(webhookUrl)
  const destination = getWebhookDestination(webhookUrl)
  const title = `FeelsOdd incident: ${riskLabel} riziko`
  const summary = [
    companyName ? `Účet: ${companyName}` : '',
    `Zdroj: ${sourceLabel}`,
    `Odosielateľ: ${submittedBy}`,
    phoneFrom ? `Číslo: ${phoneFrom}` : '',
    `Stav: ${status}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const payload = channel === 'teams'
      ? {
          '@type': 'MessageCard',
          '@context': 'https://schema.org/extensions',
          summary: title,
          themeColor: getRiskColor(riskLevel),
          title,
          sections: [
            {
              facts: [
                { name: 'Firma', value: companyName || 'FeelsOdd účet' },
                { name: 'Zdroj', value: sourceLabel },
                { name: 'Riziko', value: riskLabel },
                { name: 'Status', value: status },
                { name: 'Odosielateľ', value: submittedBy },
                ...(phoneFrom ? [{ name: 'Číslo', value: phoneFrom }] : []),
              ],
              text: `${trimSnippet(snippet)}${reasons.length > 0 ? `\n\nDôvody: ${reasons.join(', ')}` : ''}`,
            },
          ],
          potentialAction: reportUrl
            ? [{
                '@type': 'OpenUri',
                name: 'Otvoriť report',
                targets: [{ os: 'default', uri: reportUrl }],
              }]
            : undefined,
        }
      : {
          text: `${title}\n${summary}\n${reportUrl || ''}`.trim(),
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: title },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Firma:* ${companyName || 'FeelsOdd účet'}\n*Zdroj:* ${sourceLabel}\n*Odosielateľ:* ${submittedBy}${phoneFrom ? `\n*Číslo:* ${phoneFrom}` : ''}\n*Status:* ${status}\n*Riziko:* ${riskLabel}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Výňatok:* ${trimSnippet(snippet)}${reasons.length > 0 ? `\n*Dôvody:* ${reasons.join(', ')}` : ''}`,
              },
            },
            ...(reportUrl
              ? [{
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: 'Otvoriť report' },
                      url: reportUrl,
                    },
                  ],
                }]
              : []),
          ],
        }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const responseText = await response.text().catch(() => '')
      throw new Error(`Webhook vrátil ${response.status}: ${responseText.slice(0, 200)}`)
    }

    await recordAlertDelivery({
      companyId,
      requestId,
      channel,
      destination,
      source,
      riskLevel,
      status: 'sent',
      submittedBy,
    })

    return { sent: true }
  } catch (error) {
    console.error('[incident-alert]', error)
    const message = error instanceof Error ? error.message : 'Webhook alert zlyhal.'
    await recordAlertDelivery({
      companyId,
      requestId,
      channel,
      destination,
      source,
      riskLevel,
      status: 'failed',
      submittedBy,
      errorMessage: message,
    })
    if (throwOnError) {
      throw new Error(message)
    }
    return { sent: false, error: message }
  }
}

async function recordAlertDelivery({
  companyId,
  requestId,
  channel,
  destination,
  source,
  riskLevel,
  status,
  submittedBy,
  errorMessage,
}: {
  companyId?: string
  requestId?: string
  channel: AlertDeliveryChannel
  destination: string
  source: RequestSource
  riskLevel: RiskLevel
  status: 'sent' | 'failed'
  submittedBy: string
  errorMessage?: string
}) {
  try {
    const supabase = createServiceClient()
    if (!supabase) return

    const { error } = await supabase
      .from('alert_deliveries')
      .insert({
        company_id: companyId || null,
        request_id: requestId || null,
        channel,
        destination,
        source,
        risk_level: riskLevel,
        status,
        submitted_by: submittedBy,
        error_message: errorMessage || null,
      })

    if (error) {
      console.error('[incident-alert-log]', error)
    }
  } catch (error) {
    console.error('[incident-alert-log]', error)
  }
}
