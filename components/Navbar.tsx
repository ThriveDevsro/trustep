"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, LogOut, Menu, X } from "lucide-react";
import {
  deriveAccountNameFromEmail,
  getCurrentAppUser,
  signOutAppUser,
} from "@/lib/app-auth";
import { BrandLogo } from "@/components/BrandLogo";

const NAV_LINKS = [
  { href: "/ako-to-funguje", label: "Ako to funguje" },
  { href: "/pre-firmy", label: "Riešenie" },
  { href: "/cennik", label: "Cenník" },
];

export function Navbar() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountLabel, setAccountLabel] = useState("Účet");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const user = await getCurrentAppUser();
      if (cancelled) return;

      if (user) {
        setIsLoggedIn(true);
        setAccountLabel(deriveAccountNameFromEmail(user.email));
      } else {
        setIsLoggedIn(false);
        setAccountLabel("Účet");
      }

      setLoadingAuth(false);
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;

      if (mobileOpen || currentScrollY < 24) {
        setHeaderVisible(true);
      } else if (Math.abs(currentScrollY - lastScrollY.current) > 6) {
        setHeaderVisible(currentScrollY < lastScrollY.current);
      }

      lastScrollY.current = currentScrollY;
    }

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  async function handleLogout() {
    await signOutAppUser();
    setIsLoggedIn(false);
    setAccountLabel("Účet");
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-[#0F172A] backdrop-blur-xl transition-transform duration-300 ease-out ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="mx-auto flex h-[74px] max-w-[1320px] items-center justify-between gap-4 px-5 sm:h-[82px] sm:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <BrandLogo theme="dark" size="lg" />
        </Link>

        <div className="hidden items-center gap-9 text-[15px] font-semibold text-slate-600 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#2563EB]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {loadingAuth ? (
            <div className="hidden sm:block px-4 py-2 text-[15px] font-medium text-slate-400">
              Načítavam...
            </div>
          ) : isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:border-slate-300"
              >
                <LayoutGrid className="h-4 w-4 text-[#22D3EE]" />
                {accountLabel}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[15px] font-semibold text-slate-500 transition-colors hover:text-[#0F172A]"
              >
                <LogOut className="w-4 h-4" />
                Odhlásiť
              </button>
            </div>
          ) : null}
          {!loadingAuth && !isLoggedIn && (
            <>
              <Link
                href="/login"
                className="hidden px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[#0F172A] sm:block"
              >
                Prihlásiť sa
              </Link>
              <Link
                href="/dohodnut-ukazku"
                className="hidden min-h-11 items-center justify-center rounded-lg bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,.2)] transition hover:bg-[#3B82F6] sm:inline-flex"
              >
                Dohodnúť si ukážku
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[#0F172A] md:hidden"
            aria-label={mobileOpen ? "Zavrieť menu" : "Otvoriť menu"}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-6 pt-4 md:hidden">
          <Link
            href={isLoggedIn ? "/submit" : "/login"}
            onClick={() => setMobileOpen(false)}
            className="mb-3 flex min-h-12 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white"
          >
            {isLoggedIn ? "Otvoriť overenie" : "Prihlásiť sa"}
          </Link>
          <div className="border-t border-slate-200">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block border-b border-slate-200 px-1 py-4 text-sm font-semibold text-slate-700"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4 text-slate-700">
            {loadingAuth ? (
              <div className="text-sm font-medium text-slate-500">
                Načítavam účet...
              </div>
            ) : isLoggedIn ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Prihlásený účet
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-950">
                    {accountLabel}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="px-1 py-2 text-sm font-semibold text-slate-900"
                  >
                    Otvoriť dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-1 py-2 text-left text-sm font-semibold text-red-600"
                  >
                    Odhlásiť sa
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Link
                    href="/dohodnut-ukazku"
                    onClick={() => setMobileOpen(false)}
                    className="bg-[#2563EB] px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Dohodnúť si ukážku
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
