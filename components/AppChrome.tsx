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
    pathname.startsWith('/login/') ||
    pathname.startsWith('/register/') ||
    pathname.startsWith('/auth/')
  const isWorkspacePage =
    pathname === '/dashboard' ||
    pathname === '/inboxes' ||
    pathname.startsWith('/inboxes/') ||
    pathname === '/submit' ||
    pathname.startsWith('/submit/') ||
    pathname === '/link-check' ||
    pathname.startsWith('/link-check/') ||
    pathname === '/sms' ||
    pathname === '/submit-call' ||
    pathname.startsWith('/report/')

  if (isAuthPage) {
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
