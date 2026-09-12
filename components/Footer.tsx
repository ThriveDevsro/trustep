import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const PUBLIC_LINKS = [
  { href: "/ako-to-funguje", label: "Ako to funguje" },
  { href: "/pre-firmy", label: "Riešenie" },
  { href: "/cennik", label: "Cenník" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#1E293B] bg-[#020617] text-white">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-14 py-16 md:grid-cols-[1.35fr_0.65fr] md:py-[72px]">
          <div>
            <Link
              href="/"
              className="inline-flex transition-opacity hover:opacity-75"
            >
              <BrandLogo theme="light" className="text-4xl sm:text-5xl" />
            </Link>
            <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
              Overte, kto je za komunikáciou, skôr než podľa nej konáte.
            </p>
            <a
              href="mailto:hello@truststep.sk"
              className="mt-6 inline-block text-sm font-bold text-white transition-colors hover:text-[#22D3EE]"
            >
              hello@truststep.sk
            </a>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Navigácia</h3>
            <nav className="mt-5 space-y-3">
              {PUBLIC_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm font-bold text-slate-300 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 py-7 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} FeelsOdd</span>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="/ochrana-sukromia"
              className="transition-colors hover:text-white"
            >
              Ochrana osobných údajov
            </Link>
            <Link
              href="/podmienky-pouzivania"
              className="transition-colors hover:text-white"
            >
              Podmienky používania
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
