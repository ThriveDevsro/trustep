import clsx from 'clsx'

interface BrandLogoProps {
  theme?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BrandLogo({ theme = 'dark', size = 'md', className }: BrandLogoProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-baseline font-extrabold leading-none tracking-tight',
        theme === 'light' ? 'text-white' : 'text-slate-950',
        size === 'sm' && 'text-base',
        size === 'md' && 'text-xl',
        size === 'lg' && 'text-2xl',
        className,
      )}
      aria-label="TrustStep"
    >
      Trust<span className="text-[#FF4F00]">Step</span>
    </span>
  )
}
