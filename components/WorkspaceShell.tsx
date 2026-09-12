"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOutAppUser } from "@/lib/app-auth";
import { BrandLogo } from "@/components/BrandLogo";

const navigation = [
  { href: "/dashboard", label: "Prehľad", icon: LayoutDashboard },
  { href: "/submit", label: "Overiť", icon: ShieldCheck },
  { href: "/historia", label: "História", icon: ReceiptText },
  { href: "/doveryhodne-kontakty", label: "Kontakty", icon: UserRound },
  { href: "/inboxes", label: "Schránky", icon: Inbox },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;

      if (open || currentScrollY < 24) {
        setHeaderVisible(true);
      } else if (Math.abs(currentScrollY - lastScrollY.current) > 6) {
        setHeaderVisible(currentScrollY < lastScrollY.current);
      }

      lastScrollY.current = currentScrollY;
    }

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open]);

  async function logout() {
    await signOutAppUser();
    router.push("/login");
  }

  return (
    <div className="workspace-shell min-h-screen bg-[#F7F9FC] text-[#0A2550]">
      <header
        className={`sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl transition-transform duration-300 ease-out ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="mx-auto flex h-[78px] max-w-[1320px] items-center gap-7 px-5 sm:px-8">
          <Link
            href="/dashboard"
            className="flex shrink-0 transition-opacity hover:opacity-75"
            onClick={() => setOpen(false)}
          >
            <BrandLogo theme="dark" size="lg" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#EAF2FF] text-[#155CD8]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#0A2550]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <Link
              href="/ucet"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#0A2550]"
            >
              <UserRound className="h-4 w-4" />
              Účet
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0A2550]"
              aria-label="Odhlásiť sa"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0A2550] md:hidden"
            aria-label="Otvoriť navigáciu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 bg-white px-5 pb-5 pt-3 md:hidden">
            <nav className="grid gap-1">
              {navigation.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold ${
                    isActive(pathname, href)
                      ? "bg-[#EAF2FF] text-[#155CD8]"
                      : "text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
            <Link
              href="/ucet"
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center gap-3 border-t border-slate-100 px-3 pt-4 text-sm font-bold text-slate-600"
            >
              <UserRound className="h-4 w-4" />
              Účet
            </Link>
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center gap-3 px-3 pt-2 text-sm font-bold text-slate-500"
            >
              <LogOut className="h-4 w-4" />
              Odhlásiť sa
            </button>
          </div>
        )}
      </header>

      <main className="workspace-surface min-h-[calc(100vh-78px)]">
        {children}
      </main>
    </div>
  );
}
