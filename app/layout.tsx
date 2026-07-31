import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWARegister } from '@/components/PWARegister'
import AppChrome from '@/components/AppChrome'
import { LanguageProvider } from '@/components/LanguageProvider'

export const metadata: Metadata = {
  title: 'TrustStep — Bezpečnostná brzda pre firmy',
  description: 'Ochráňte svoju firmu pred AI podvodmi, phishingom a falošnými platobnými pokynmi.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'TrustStep',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f766e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="bg-white text-slate-900 antialiased">
        <PWARegister />
        <LanguageProvider>
          <AppChrome>{children}</AppChrome>
        </LanguageProvider>
      </body>
    </html>
  )
}
