'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { WorkspaceShell } from '@/components/WorkspaceShell'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/reset-hesla' ||
    pathname === '/nove-heslo' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/register/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/prijmout-pozvanku/')
  const isWorkspacePage =
    pathname === '/dashboard' ||
    pathname === '/ucet' ||
    pathname.startsWith('/ucet/') ||
    pathname === '/inboxes' ||
    pathname.startsWith('/inboxes/') ||
    pathname === '/submit' ||
    pathname.startsWith('/submit/') ||
    pathname === '/link-check' ||
    pathname.startsWith('/link-check/') ||
    pathname === '/sms' ||
    pathname === '/historia' ||
    pathname.startsWith('/historia/') ||
    pathname === '/o-mne' ||
    pathname === '/doveryhodne-kontakty' ||
    pathname === '/predplatne' ||
    pathname.startsWith('/predplatne/') ||
    pathname === '/tim' ||
    pathname.startsWith('/tim/') ||
    pathname === '/test-odolnosti' ||
    pathname === '/submit-call' ||
    pathname.startsWith('/report/')

  const isImmersivePage = pathname === '/vyskusat'

  if (isAuthPage || isImmersivePage) {
    return <main className="relative isolate min-h-screen">{children}</main>
  }

  if (isWorkspacePage) {
    return <WorkspaceShell>{children}</WorkspaceShell>
  }

  return (
    <>
      <Navbar />
      <main className="relative isolate min-h-[70vh]">{children}</main>
      <Footer />
    </>
  )
}

export default AppChrome
