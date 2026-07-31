'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, LogOut, Menu, X } from 'lucide-react'
import { deriveAccountNameFromEmail, getCurrentAppUser, signOutAppUser } from '@/lib/app-auth'
import { BrandLogo } from '@/components/BrandLogo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/components/LanguageProvider'

const NAV_LINKS: Array<{ href: string; sk: string; en: string }> = []

export function Navbar() {
  const { language } = useLanguage()
  const router = useRouter()
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accountLabel, setAccountLabel] = useState('Účet')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const user = await getCurrentAppUser()
      if (cancelled) return

      if (user) {
        setIsLoggedIn(true)
        setAccountLabel(deriveAccountNameFromEmail(user.email))
      } else {
        setIsLoggedIn(false)
        setAccountLabel('Účet')
      }

      setLoadingAuth(false)
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await signOutAppUser()
    setIsLoggedIn(false)
    setAccountLabel('Účet')
    setMobileOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-[#07152d] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="transition-opacity hover:opacity-75">
          <BrandLogo size="md" />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-bold text-slate-600 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[#07152d]">
              {link[language]}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>
          {loadingAuth ? (
            <div className="hidden sm:block px-4 py-2 text-[15px] font-medium text-slate-400">
              Načítavam...
            </div>
          ) : isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <LayoutGrid className="h-4 w-4 text-[#57a8ff]" />
                {accountLabel}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[15px] font-semibold text-slate-500 transition-colors hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Odhlásiť
              </button>
            </div>
          ) : (
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:text-[#07152d] sm:block">
              {language === 'sk' ? 'Prihlásiť' : 'Log in'}
            </Link>
          )}
          <Link
            href="/submit"
            className="flex items-center gap-2 rounded-xl bg-[#ff5b19] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#ff7139]"
          >
            {language === 'sk' ? 'Analyzovať' : 'Analyze'}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2.5 text-[#07152d] md:hidden"
            aria-label={mobileOpen ? 'Zavrieť menu' : 'Otvoriť menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#dfe5eb] bg-[#f4f6f8] px-4 pb-4 pt-3 md:hidden">
          <div className="grid gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl border border-[#ded7cc] px-4 py-3 text-sm font-semibold text-[#6e6775] hover:bg-white"
              >
                {link[language]}
              </Link>
            ))}
          </div>



          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-4">
            {loadingAuth ? (
              <div className="text-sm font-medium text-teal-900">Načítavam účet...</div>
            ) : isLoggedIn ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Prihlásený účet</div>
                  <div className="mt-1 text-sm font-bold text-slate-950">{accountLabel}</div>
                </div>
                <div className="grid gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    Otvoriť dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl bg-transparent px-4 py-3 text-left text-sm font-semibold text-red-600"
                  >
                    Odhlásiť sa
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">

                <div className="grid gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    Prihlásiť sa
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Vytvoriť účet
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
