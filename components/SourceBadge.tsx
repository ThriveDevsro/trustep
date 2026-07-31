import { cn } from '@/lib/utils'
import type { RequestSource } from '@/lib/types'

const config: Record<RequestSource, { label: string; icon: string; className: string }> = {
  web:   { label: 'Web',    icon: '🌐', className: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  email: { label: 'E-mail', icon: '📧', className: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  sms:   { label: 'SMS',    icon: '💬', className: 'bg-green-500/10 text-green-300 border-green-500/20' },
  call:  { label: 'Hovor',  icon: '📞', className: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  image: { label: 'Screenshot', icon: '🖼️', className: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
}

export function SourceBadge({ source }: { source: RequestSource }) {
  const { label, icon, className } = config[source] ?? config.web
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border', className)}>
      {icon} {label}
    </span>
  )
}
