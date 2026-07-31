'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  FileSearch,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { signOutAppUser } from '@/lib/app-auth'
import { BrandLogo } from '@/components/BrandLogo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/components/LanguageProvider'

const navigation = [
  { href: '/dashboard', sk: 'Prehľad', en: 'Overview', icon: LayoutDashboard },
  { href: '/submit', sk: 'Analýza', en: 'Analyze', icon: FileSearch },
  { href: '/link-check', sk: 'Overiť link', en: 'Check link', icon: Link2 },
  { href: '/inboxes', sk: 'Inboxy', en: 'Inboxes', icon: Mail },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  if (href === '/submit') {
    return pathname === '/submit' || pathname === '/sms' || pathname === '/submit-call'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { language } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    await signOutAppUser()
    router.push('/login')
  }

  return (
    <div className="workspace-shell min-h-screen bg-[#f4f5f7] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 text-[#111827] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-8 px-5 sm:px-8">
          <Link href="/dashboard" className="flex shrink-0 transition-opacity hover:opacity-75" onClick={() => setOpen(false)}>
            <BrandLogo size="md" />
          </Link>

          <nav className="hidden h-full items-center gap-1 md:flex">
            {navigation.map(({ href, sk, en, icon: Icon }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex h-full items-center gap-2 px-4 text-sm font-bold transition-colors ${
                    active ? 'text-[#111827]' : 'text-gray-400 hover:text-[#111827]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {language === 'sk' ? sk : en}
                  {active && <span className="absolute inset-x-4 bottom-0 h-0.5 bg-[#ff4f00]" />}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <LanguageSwitcher compact />
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-black"
            >
              {language === 'sk' ? 'Nová analýza' : 'New analysis'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111827]"
              aria-label="Odhlásiť sa"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 md:hidden"
            aria-label="Otvoriť navigáciu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-black/5 bg-white px-5 pb-5 pt-3 md:hidden">
            <nav className="grid gap-1">
              {navigation.map(({ href, sk, en, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold ${
                    isActive(pathname, href) ? 'bg-gray-100 text-[#111827]' : 'text-gray-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {language === 'sk' ? sk : en}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center gap-3 border-t border-black/5 px-3 pt-4 text-sm font-bold text-gray-400"
            >
              <LogOut className="h-4 w-4" />
              Odhlásiť sa
            </button>
          </div>
        )}
      </header>

      <main className="workspace-surface min-h-[calc(100vh-72px)]">{children}</main>
    </div>
  )
}
