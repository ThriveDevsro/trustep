import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/BrandLogo'

interface AuthShellProps {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-[#0F172A]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#2563EB_35%,#22D3EE_65%,transparent)]" />
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 pt-6 sm:px-8 lg:px-12 lg:pt-9">
          <Link href="/" aria-label="FeelsOdd – domovská stránka">
            <BrandLogo size="md" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[#0F172A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Späť na web
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
          <section className="w-full max-w-[440px]">
            <div className="mb-8">
              <h1 className="text-balance font-display text-[38px] font-semibold leading-none tracking-[-.055em] text-[#020617] sm:text-[42px]">
                {title}
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-slate-500">{description}</p>
            </div>

            {children}

            <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
              {footer}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
