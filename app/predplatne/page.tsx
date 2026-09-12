"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { getAppAuthHeaders, getCurrentAppUser } from "@/lib/app-auth";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0 €",
    limit: "10 overení mesačne",
    summary: "Správy, odkazy a screenshoty s históriou výsledkov.",
  },
  {
    id: "plus",
    name: "Plus",
    price: "9 € / mesiac",
    limit: "100 overení mesačne",
    summary: "Import e-mailov, neobmedzená história a prednostné spracovanie.",
  },
  {
    id: "team",
    name: "Team",
    price: "49 € / mesiac",
    limit: "1 000 overení mesačne",
    summary: "Päť členov, tri schránky a spoločný prehľad incidentov.",
  },
];

interface Usage {
  plan: string;
  used: number;
  limit: number;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        if (!(await getCurrentAppUser())) {
          router.replace("/login?next=%2Fpredplatne");
          return;
        }

        const response = await fetch("/api/account/usage", {
          headers: await getAppAuthHeaders(),
        });
        if (!response.ok) throw new Error("Údaje o predplatnom sa nepodarilo načítať.");
        setUsage(await response.json());
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Údaje o predplatnom sa nepodarilo načítať.");
      }
    })();
  }, [router]);

  if (loadError) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#F8FAFC] px-5">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-semibold tracking-[-.05em] text-[#020617]">
            Predplatné sa nepodarilo načítať
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 h-11 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Skúsiť znova
          </button>
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  const percent = Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const remaining = Math.max(0, usage.limit - usage.used);
  const planLabel = usage.plan === "plus" ? "Plus" : usage.plan === "team" ? "Team" : "Free";
  const isPaidPlan = usage.plan === "plus" || usage.plan === "team";

  return (
    <div className="min-h-full bg-[#F8FAFC] text-[#020617]">
      <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
              Predplatné a fakturácia
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-500">
              Aktuálny plán, využitie a fakturačné údaje vášho účtu.
            </p>
          </div>
          <nav className="flex gap-6 text-sm font-semibold" aria-label="Sekcie stránky">
            <a href="#predplatne" className="text-[#2563EB]">Predplatné</a>
            <a href="#fakturacia" className="text-slate-500 hover:text-[#020617]">Fakturácia</a>
          </nav>
        </header>

        <section id="predplatne" className="scroll-mt-28 pt-8">
          <div className="overflow-hidden rounded-2xl bg-[#1558E8] text-white">
            <div className="grid gap-10 px-6 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1fr_1.1fr] lg:items-end lg:px-10">
              <div>
                <p className="text-sm font-medium text-blue-100">Aktuálny plán</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <h2 className="font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
                    FeelsOdd {planLabel}
                  </h2>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    Aktívny
                  </span>
                </div>
                <p className="mt-5 max-w-lg text-sm leading-6 text-blue-50">
                  {remaining > 0
                    ? `Tento mesiac máte k dispozícii ešte ${remaining} overení.`
                    : "Mesačný limit je vyčerpaný. Pre ďalšie overenia zmeňte plán."}
                </p>
              </div>

              <div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-100">Využitie v tomto mesiaci</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {usage.used} <span className="text-base font-medium text-blue-100">z {usage.limit}</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{percent} %</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0B3FAF]">
                  <div
                    className="h-full rounded-full bg-white transition-[width]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-blue-100">Limit sa obnoví prvý deň nasledujúceho mesiaca.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16" aria-labelledby="plans-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="plans-heading" className="font-display text-3xl font-semibold tracking-[-.05em]">
                Dostupné plány
              </h2>
              <p className="mt-2 text-sm text-slate-500">Zvoľte objem, ktorý zodpovedá vášmu používaniu.</p>
            </div>
            <Link href="/cennik" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
              Detailné porovnanie <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 border-y border-slate-200 bg-white">
            {PLANS.map((plan) => {
              const active = usage.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className="grid gap-5 border-b border-slate-200 px-0 py-6 last:border-b-0 sm:px-6 lg:grid-cols-[150px_170px_1fr_180px] lg:items-center"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {active && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#2563EB]">
                        Aktívny
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold">{plan.price}</p>
                    <p className="mt-1 text-xs text-slate-500">{plan.limit}</p>
                  </div>
                  <p className="max-w-lg text-sm leading-6 text-slate-500">{plan.summary}</p>
                  <div className="lg:text-right">
                    {active ? (
                      <span className="text-sm font-medium text-slate-400">Váš súčasný plán</span>
                    ) : (
                      <a
                        href={`mailto:hello@truststep.sk?subject=Zmena plánu na FeelsOdd ${plan.name}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                      >
                        Zvoliť {plan.name}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Zmena plánu sa vykoná až po vašom potvrdení. Automatické online platby zatiaľ nie sú aktívne.
          </p>
        </section>

        <section id="fakturacia" className="scroll-mt-28 border-t border-slate-200 py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-20">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-[-.05em]">Fakturácia</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Stav platieb, fakturačné údaje a doklady účtu.
              </p>
            </div>

            <div className="border-t border-slate-300">
              <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
                <dt className="text-sm font-semibold text-slate-500">Spôsob fakturácie</dt>
                <dd className="text-sm font-medium text-[#0F172A]">
                  {isPaidPlan ? "Individuálne spravované predplatné" : "Bez fakturácie – používate bezplatný plán"}
                </dd>
              </div>
              <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
                <dt className="text-sm font-semibold text-slate-500">Platobná metóda</dt>
                <dd className="text-sm font-medium text-[#0F172A]">Žiadna uložená platobná karta</dd>
              </div>
              <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
                <dt className="text-sm font-semibold text-slate-500">Automatická obnova</dt>
                <dd className="text-sm font-medium text-[#0F172A]">Vypnutá – nič sa neúčtuje automaticky</dd>
              </div>
              <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
                <dt className="text-sm font-semibold text-slate-500">Faktúry</dt>
                <dd className="text-sm font-medium text-[#0F172A]">Zatiaľ nemáte žiadne faktúry na stiahnutie.</dd>
              </div>

              <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-6 text-slate-500">
                  Potrebujete zmeniť fakturačné údaje, plán alebo požiadať o doklad?
                </p>
                <a
                  href="mailto:hello@truststep.sk?subject=Fakturácia FeelsOdd"
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#020617] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0F172A]"
                >
                  Kontaktovať podporu
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
