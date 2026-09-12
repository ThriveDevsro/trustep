import { Resend } from 'resend'

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error('E-mailové odosielanie nie je nakonfigurované. Nastavte RESEND_API_KEY.')
  }

  return new Resend(apiKey)
}

export async function sendApprovalEmail({
  to,
  requestId,
  approverToken,
  riskLevel,
  submittedBy,
  snippet,
}: {
  to: string
  requestId: string
  approverToken: string
  riskLevel: string
  submittedBy: string
  snippet: string
}) {
  const resend = getResendClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const approveUrl = `${appUrl}/approve/${approverToken}?action=approve`
  const rejectUrl = `${appUrl}/approve/${approverToken}?action=reject`
  const reportUrl = `${appUrl}/report/${requestId}`

  const riskColor = riskLevel === 'high' ? '#EF4444' : riskLevel === 'medium' ? '#F59E0B' : '#10B981'
  const riskLabel = riskLevel === 'high' ? 'VYSOKÉ' : riskLevel === 'medium' ? 'STREDNÉ' : 'NÍZKE'

  await resend.emails.send({
    from: 'FeelsOdd <noreply@truststep.app>',
    to,
    subject: `[FeelsOdd] Žiadosť o overenie — riziko: ${riskLabel}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,sans-serif;background:#F9FAFB;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#0A0F1E;padding:24px 32px;display:flex;align-items:center;gap:12px">
      <span style="color:#3B82F6;font-size:20px;font-weight:700">FeelsOdd</span>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px">Žiadosť o overenie podozrivej inštrukcie</h2>
      <p style="margin:0 0 24px;color:#6B7280">Zamestnanec <strong>${submittedBy}</strong> nahlásil podozrivú správu. Prosím overte ju.</p>

      <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin-bottom:24px;border-left:4px solid ${riskColor}">
        <div style="font-size:12px;font-weight:600;color:${riskColor};text-transform:uppercase;margin-bottom:8px">Úroveň rizika: ${riskLabel}</div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6">${snippet}</p>
      </div>

      <a href="${reportUrl}" style="display:inline-block;margin-bottom:24px;color:#3B82F6;font-size:14px;text-decoration:none">→ Zobraziť úplnú správu s AI analýzou</a>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a href="${approveUrl}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">✓ Schváliť</a>
        <a href="${rejectUrl}" style="display:inline-block;background:#EF4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">✗ Zamietnuť</a>
      </div>

      <p style="margin:24px 0 0;color:#9CA3AF;font-size:12px">Táto správa bola automaticky vygenerovaná systémom FeelsOdd. ID žiadosti: ${requestId}</p>
    </div>
  </div>
</body>
</html>`,
  })
}

export async function sendTeamInviteEmail({ to, companyName, role, inviteUrl }: { to: string; companyName: string; role: 'admin' | 'member'; inviteUrl: string }) {
  const resend = getResendClient()
  await resend.emails.send({
    from: 'FeelsOdd <noreply@truststep.app>', to,
    subject: `Pozvánka do tímu ${companyName} v FeelsOdd`,
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:28px"><h1 style="color:#0b2854">Pozvánka do FeelsOdd</h1><p>Boli ste pozvaný do tímu <strong>${companyName}</strong> ako ${role === 'admin' ? 'administrátor' : 'zamestnanec'}.</p><p><a href="${inviteUrl}" style="display:inline-block;background:#0b2854;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Prijať pozvánku</a></p><p style="color:#64748b;font-size:13px">Ak ešte nemáte účet, po otvorení odkazu si ho jednoducho vytvoríte týmto e-mailom.</p></div>`,
  })
}

export async function sendDailyDigestEmail({
  to,
  companyName,
  summary,
}: {
  to: string
  companyName: string
  summary: {
    totalIncidents24h: number
    highIncidents24h: number
    mediumIncidents24h: number
    failedAlerts24h: number
    inboxErrors: number
    sourceLines: string[]
    topIncidentLines: string[]
    inboxLines: string[]
  }
}) {
  const resend = getResendClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const dashboardUrl = appUrl ? `${appUrl}/dashboard` : ''
  const inboxesUrl = appUrl ? `${appUrl}/inboxes` : ''

  await resend.emails.send({
    from: 'FeelsOdd <noreply@truststep.app>',
    to,
    subject: `[FeelsOdd] Denný digest — ${companyName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,sans-serif;background:#F8FAFC;margin:0;padding:24px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#0A0F1E;padding:24px 32px;color:#fff">
      <div style="font-size:20px;font-weight:800">FeelsOdd</div>
      <div style="margin-top:8px;font-size:14px;color:#CBD5E1">Denný bezpečnostný digest pre ${companyName}</div>
    </div>
    <div style="padding:28px 32px">
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:24px">
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px">
          <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase">Incidenty 24h</div>
          <div style="margin-top:6px;font-size:30px;font-weight:900;color:#0F172A">${summary.totalIncidents24h}</div>
        </div>
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px">
          <div style="font-size:12px;font-weight:700;color:#B91C1C;text-transform:uppercase">High risk 24h</div>
          <div style="margin-top:6px;font-size:30px;font-weight:900;color:#B91C1C">${summary.highIncidents24h}</div>
        </div>
        <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:16px">
          <div style="font-size:12px;font-weight:700;color:#C2410C;text-transform:uppercase">Medium risk 24h</div>
          <div style="margin-top:6px;font-size:30px;font-weight:900;color:#C2410C">${summary.mediumIncidents24h}</div>
        </div>
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px">
          <div style="font-size:12px;font-weight:700;color:#1D4ED8;text-transform:uppercase">Failed alerty / inbox chyby</div>
          <div style="margin-top:6px;font-size:30px;font-weight:900;color:#1E3A8A">${summary.failedAlerts24h} / ${summary.inboxErrors}</div>
        </div>
      </div>

      <h3 style="margin:0 0 10px;color:#111827;font-size:16px">Zdroje incidentov</h3>
      <ul style="margin:0 0 22px;padding-left:18px;color:#374151;font-size:14px;line-height:1.7">
        ${(summary.sourceLines.length > 0 ? summary.sourceLines : ['Bez incidentov za posledných 24 hodín.']).map((line) => `<li>${line}</li>`).join('')}
      </ul>

      <h3 style="margin:0 0 10px;color:#111827;font-size:16px">Najnovšie priority</h3>
      <ul style="margin:0 0 22px;padding-left:18px;color:#374151;font-size:14px;line-height:1.7">
        ${(summary.topIncidentLines.length > 0 ? summary.topIncidentLines : ['Žiadne medium/high incidenty za posledných 24 hodín.']).map((line) => `<li>${line}</li>`).join('')}
      </ul>

      <h3 style="margin:0 0 10px;color:#111827;font-size:16px">Stav inboxov</h3>
      <ul style="margin:0 0 26px;padding-left:18px;color:#374151;font-size:14px;line-height:1.7">
        ${(summary.inboxLines.length > 0 ? summary.inboxLines : ['Žiadne pripojené schránky.']).map((line) => `<li>${line}</li>`).join('')}
      </ul>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${dashboardUrl ? `<a href="${dashboardUrl}" style="display:inline-block;background:#0F172A;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Otvoriť dashboard</a>` : ''}
        ${inboxesUrl ? `<a href="${inboxesUrl}" style="display:inline-block;background:#E2E8F0;color:#0F172A;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Otvoriť inboxy</a>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`,
  })
}
