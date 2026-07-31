import { AlertTriangle, Ban, CheckCircle2, PhoneCall, ShieldAlert } from 'lucide-react'
import { RiskBadge } from '@/components/RiskBadge'
import { getActionSteps, getAvoidSteps, getRiskPresentation, getVerificationSteps } from '@/lib/analysis-presentation'
import type { RiskLevel } from '@/lib/types'

interface AnalysisInsightsProps {
  riskLevel: RiskLevel
  reasons: string[]
  recommendation: string
  hostname?: string
  title?: string
  tone?: 'light' | 'dark'
}

const resultStyle = {
  low: {
    accent: 'text-emerald-700',
    line: 'border-emerald-600',
    icon: <CheckCircle2 className="h-6 w-6" />,
    decision: 'Pokračovať opatrne',
  },
  medium: {
    accent: 'text-amber-700',
    line: 'border-amber-500',
    icon: <AlertTriangle className="h-6 w-6" />,
    decision: 'Overiť mimo správy',
  },
  high: {
    accent: 'text-red-700',
    line: 'border-red-600',
    icon: <ShieldAlert className="h-6 w-6" />,
    decision: 'Zastaviť a eskalovať',
  },
} as const

function Section({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <section className="border-t border-gray-200 pt-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em] text-gray-500">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

export function AnalysisInsights({
  riskLevel,
  reasons,
  recommendation,
  hostname,
  title,
}: AnalysisInsightsProps) {
  const copy = getRiskPresentation(riskLevel)
  const actions = getActionSteps(recommendation, riskLevel).slice(0, 3)
  const avoidSteps = getAvoidSteps(riskLevel).slice(0, 3)
  const verificationSteps = getVerificationSteps(riskLevel, hostname).slice(0, 3)
  const style = resultStyle[riskLevel]

  return (
    <div className="space-y-8">
      <header className={`border-l-4 ${style.line} pl-5`}>
        <div className={`mb-3 flex items-center gap-3 ${style.accent}`}>
          {style.icon}
          <RiskBadge level={riskLevel} />
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-gray-600">
          {copy.summary}
        </p>

        <div className="mt-6">
          <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-400">Odporúčané rozhodnutie</div>
          <div className={`mt-2 text-xl font-extrabold ${style.accent}`}>{style.decision}</div>
        </div>
      </header>

      {(hostname || title) && (
        <div className="border-y border-gray-200 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {hostname && (
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Zdroj</div>
                <div className="mt-1 break-all text-sm font-bold text-gray-950">{hostname}</div>
              </div>
            )}
            {title && (
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Názov</div>
                <div className="mt-1 text-sm font-bold text-gray-950">{title}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <Section title="Čo spraviť teraz">
        <ol className="grid gap-4">
          {actions.map((step, index) => (
            <li key={`${step}-${index}`} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="text-sm font-extrabold text-teal-700">{index + 1}.</span>
              <span className="text-base font-semibold leading-relaxed text-gray-900">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Prečo" icon={<AlertTriangle className="h-4 w-4" />}>
          {reasons.length > 0 ? (
            <ul className="space-y-3">
              {reasons.map((reason, index) => (
                <li key={`${reason}-${index}`} className="flex gap-3 text-sm font-medium leading-relaxed text-gray-700">
                  <span className="mt-2 h-1.5 w-1.5 flex-none bg-gray-400" />
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-medium text-gray-500">Systém nenašiel konkrétne varovné znaky.</p>
          )}
        </Section>

        <Section title="Nerobiť" icon={<Ban className="h-4 w-4" />}>
          <ul className="space-y-3">
            {avoidSteps.map((step, index) => (
              <li key={`${step}-${index}`} className="flex gap-3 text-sm font-medium leading-relaxed text-gray-700">
                <span className="mt-2 h-1.5 w-1.5 flex-none bg-gray-400" />
                {step}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Bezpečné overenie" icon={<PhoneCall className="h-4 w-4" />}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {verificationSteps.map((step, index) => (
            <li key={`${step}-${index}`} className="border-t border-gray-200 pt-3 text-sm font-medium leading-relaxed text-gray-700">
              {step}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
