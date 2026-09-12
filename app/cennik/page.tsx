"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

const PLANS = [
  {
    name: "Team",
    audience: "Pre menší tím, ktorý chce mať kontrolu nad citlivou komunikáciou",
    monthly: "49 €",
    yearly: "39 €",
    cta: "Začať s Team",
    href: "/register",
    features: [
      "Až 5 používateľov",
      "500 overení mesačne",
      "Spoločná história a zdieľané reporty",
      "Dôveryhodné kontakty pre porovnanie",
    ],
  },
  {
    name: "Business",
    audience: "Pre financie a prevádzku, kde nesmie prejsť neoverená zmena",
    monthly: "149 €",
    yearly: "119 €",
    cta: "Začať s Business",
    href: "/register",
    featured: true,
    features: [
      "Až 20 používateľov",
      "2 500 overení mesačne",
      "Schvaľovanie citlivých prípadov a eskalácie",
      "Pripojené schránky a prioritná podpora",
    ],
  },
  {
    name: "Enterprise",
    audience: "Pre organizácie s vlastnými pravidlami, schvaľovaním a integráciami",
    monthly: "Na mieru",
    yearly: "Na mieru",
    cta: "Dohodnúť si ukážku",
    href: "/dohodnut-ukazku",
    custom: true,
    features: [
      "Používatelia a objem podľa potreby",
      "Vlastné pravidlá a schvaľovacie postupy",
      "Nasadenie s vaším tímom a integrácie",
      "Dedikovaná podpora a bezpečnostný onboarding",
    ],
  },
];

const COMPARISON = [
  ["Používatelia", "Do 5", "Do 20", "Podľa potreby"],
  ["Overenia mesačne", "500", "2 500", "Podľa potreby"],
  ["Dôveryhodné kontakty", true, true, true],
  ["Spoločná história a reporty", true, true, true],
  ["Schvaľovanie a eskalácie", false, true, true],
  ["Pripojené schránky", false, true, true],
  ["Vlastné pravidlá a integrácie", false, false, true],
  ["Dedikovaný onboarding", false, false, true],
] as const;

export default function PricingPage() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="bg-white text-[#0F172A]">
      <section className="bg-[#1264F3] text-white">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[72px]">
                Bezpečné rozhodnutie pred každou citlivou platbou
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">
                FeelsOdd dáva finančným a prevádzkovým tímom jasný postup, ako
                overiť nečakanú požiadavku skôr, než zmení účet, platbu alebo prístup.
              </p>
            </div>
            <div>
              <div className="inline-flex rounded-xl bg-[#0B3E9B] p-1">
                <button
                  type="button"
                  onClick={() => setYearly(false)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${!yearly ? "bg-white text-[#1747B8]" : "text-blue-100"}`}
                >
                  Mesačne
                </button>
                <button
                  type="button"
                  onClick={() => setYearly(true)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${yearly ? "bg-white text-[#1747B8]" : "text-blue-100"}`}
                >
                  Ročne · ušetríte 20 %
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid border-y border-slate-200 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan, index) => {
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <article
                key={plan.name}
            className={`flex min-h-[600px] flex-col px-6 py-9 sm:px-8 ${index > 0 ? "border-t border-slate-200 md:border-l md:border-t-0" : ""} ${plan.featured ? "bg-[#E8F0FF]" : "bg-white"}`}
              >
                <div>
                  <h2 className="font-display text-3xl font-semibold tracking-[-.045em]">
                    {plan.name}
                  </h2>
                  <p className="mt-3 min-h-14 text-sm leading-7 text-slate-600">
                    {plan.audience}
                  </p>
                </div>
                <div className="mt-7 border-t border-slate-200 pt-7">
                  <span className="font-display text-5xl font-semibold tracking-[-.06em]">
                    {price}
                  </span>
                  {!plan.custom && (
                    <span className="ml-2 text-sm font-medium text-slate-500">/ mes.</span>
                  )}
                  <p className="mt-2 min-h-5 text-xs text-slate-500">
                    {plan.custom
                        ? "podľa rozsahu a integrácií"
                      : yearly
                        ? "pri ročnej platbe"
                        : "pri mesačnej platbe"}
                  </p>
                </div>
                <Link
                  href={plan.href}
                  className={`mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold ${plan.featured ? "bg-[#2563EB] text-white" : "border border-slate-300 text-[#0F172A]"}`}
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
                <ul className="mt-9 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" strokeWidth={2.5} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="mt-7 text-center text-sm text-slate-500">
          Ceny sú uvedené bez DPH. Pri ročnej fakturácii získate 20 % zvýhodnenie.
        </p>
      </section>

      <section className="bg-[#111318] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Bezpečnosť, ktorá nenarúša váš proces
            </h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
              Začnite s jedným schvaľovacím momentom — napríklad pri zmene IBAN alebo nečakanej faktúre — a rozšírte ochranu tam, kde ju tím naozaj potrebuje.
            </p>
          </div>
          <div className="border-t border-white/20">
            {[
              "Overenie pred platbou, zmenou účtu alebo prístupom",
              "Spoločný kontext pre financie, prevádzku a schvaľovateľov",
              "Jasná eskalácia iba pri prípadoch, ktoré to vyžadujú",
              "História rozhodnutí pripravená pre audit a spätné dohľadanie",
            ].map((item) => (
              <div key={item} className="flex gap-3 border-b border-white/20 py-5 text-sm font-medium">
                <Check className="mt-0.5 h-4 w-4 text-[#60A5FA]" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="text-center font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Porovnanie plánov</h2>
        <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.45fr_1fr_1fr_1fr] border-b border-slate-200 text-left">
              <div className="bg-[#0A2550] px-6 py-5 text-sm font-bold text-white">Funkcie</div>
              <div className="px-6 py-5 text-lg font-bold">Team</div>
              <div className="bg-[#E8F0FF] px-6 py-5 text-lg font-bold text-[#1747B8]">Business</div>
              <div className="px-6 py-5 text-lg font-bold">Enterprise</div>
            </div>
            {COMPARISON.map(([feature, team, business, enterprise]) => (
              <div key={feature} className="grid grid-cols-[1.45fr_1fr_1fr_1fr] border-b border-slate-200 last:border-b-0">
                <div className="px-6 py-4 text-sm font-semibold text-slate-700">{feature}</div>
                {[team, business, enterprise].map((value, index) => <div key={index} className={`flex items-center px-6 py-4 text-sm font-medium ${index === 1 ? "bg-[#F5F8FF]" : ""}`}>{value === true ? <Check className="h-5 w-5 text-[#2563EB]" strokeWidth={2.5} /> : value === false ? <span className="text-slate-300">—</span> : <span>{value}</span>}</div>)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
