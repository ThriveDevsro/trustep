import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

const PRODUCT_LINKS = [
  { href: '/submit', label: 'Overiť správu' },
  { href: '/link-check', label: 'Overiť link' },
]

const COMPANY_LINKS = [
  { href: '/pre-ludi', label: 'Pre ľudí' },
]

export function Footer() {
  return (
    <footer className="bg-[#111827] text-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid gap-14 py-16 md:grid-cols-[1.35fr_0.65fr_0.65fr] md:py-20">
          <div>
            <Link href="/" className="inline-flex transition-opacity hover:opacity-75">
              <BrandLogo theme="light" className="text-4xl sm:text-5xl" />
            </Link>
            <p className="mt-7 max-w-md text-sm font-medium leading-7 text-slate-400">
              Zrozumiteľný druhý názor na podozrivé správy, odkazy, faktúry a platobné pokyny
            </p>
            <a href="mailto:hello@truststep.sk" className="mt-7 inline-block text-sm font-extrabold text-white transition-colors hover:text-[#ff4f00]">
              hello@truststep.sk
            </a>
          </div>

          <div>
            <h3 className="text-xs font-extrabold text-slate-500">Produkt</h3>
            <nav className="mt-5 space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="block text-sm font-bold text-slate-300 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-xs font-extrabold text-slate-500">TrustStep</h3>
            <nav className="mt-5 space-y-3">
              {COMPANY_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="block text-sm font-bold text-slate-300 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 py-7 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} TrustStep</span>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/ochrana-sukromia" className="transition-colors hover:text-white">Ochrana súkromia</Link>
            <Link href="/podmienky-pouzivania" className="transition-colors hover:text-white">Podmienky používania</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
