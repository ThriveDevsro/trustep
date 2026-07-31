import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/lib/types'

const config = {
  low: { label: 'Nízke', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  medium: { label: 'Stredné', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high: { label: 'Vysoké', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, className } = config[level]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', className)}>
      {label}
    </span>
  )
}
