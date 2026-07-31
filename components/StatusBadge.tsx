import { cn } from '@/lib/utils'
import type { RequestStatus } from '@/lib/types'

const config = {
  pending: { label: 'Čaká', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  approved: { label: 'Schválené', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Zamietnuté', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = config[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', className)}>
      {label}
    </span>
  )
}
