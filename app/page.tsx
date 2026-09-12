import Image from "next/image";
import Link from "next/link";
import { HomeFaq } from "@/components/HomeFaq";
import {
  ArrowRight,
  BadgeCheck,
  FileSearch,
  LockKeyhole,
  MailCheck,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

const PROTECTION_AREAS = [
  { icon: FileSearch, label: "PLATBY A FAKTÚRY", title: "Zastavte zmenu účtu pred úhradou.", text: "Nový IBAN, zmena príjemcu alebo nečakaná faktúra si zaslúžia druhé overenie.", href: "/ako-to-funguje" },
  { icon: MailCheck, label: "VYDÁVANIE SA ZA OSOBU", title: "Rozpoznajte tlak, skôr než tím zareaguje.", text: "Správy od vedenia či partnera môžu vyzerať správne — dôležitý je kontext a nezávislé potvrdenie.", href: "/ako-to-funguje" },
  { icon: ScanSearch, label: "ODKAZY A PRÍSTUPY", title: "Overte, kam vás odkaz naozaj vedie.", text: "Skutočná doména, presmerovanie a prihlasovací formulár často povedia viac než samotná správa.", href: "/ako-to-funguje" },
];

const BUSINESS_FEATURES = [
  { icon: LockKeyhole, title: "Dôveryhodné kontakty", text: "Porovnanie s údajmi, ktoré si tím overil mimo novej komunikácie." },
  { icon: BadgeCheck, title: "Pravidlá pre schvaľovanie", text: "Kritické požiadavky majú jasného vlastníka a zaznamenaný postup." },
  { icon: ShieldCheck, title: "Vysvetliteľné výsledky", text: "Každé odporúčanie obsahuje dôvody, nie iba farebný štítok." },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-[#F7F9FC] text-[#091B35]">
      <section className="relative isolate overflow-hidden bg-[#081744] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_40%,rgba(46,117,255,.36),transparent_23%),radial-gradient(circle_at_88%_76%,rgba(51,211,255,.18),transparent_22%),linear-gradient(115deg,#071338_10%,#081744_62%,#0A215A_100%)]" />
        <div className="pointer-events-none absolute -right-8 top-1/2 hidden h-[610px] w-[610px] -translate-y-1/2 lg:block xl:right-[2%]">
          <Image
            src="/feelsodd-hero-shield-v1.png"
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 48vw, 610px"
            className="object-contain"
          />
        </div>
        <div className="relative mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32 lg:min-h-[690px] lg:py-0">
          <div className="flex min-h-[520px] max-w-[720px] flex-col justify-center lg:min-h-[690px]">
            <h1 className="text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[78px]">Zastavte podvod skôr, než sa stanú peniaze stratenými</h1>
            <p className="mt-8 max-w-[580px] text-pretty text-lg leading-8 text-slate-300 sm:text-xl">FeelsOdd preverí správu, odkaz alebo platobný pokyn skôr, než naň zareagujete. Jasne ukáže, čo nesedí a ako postupovať bezpečne.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2E75FF] px-6 text-sm font-bold text-white transition hover:bg-[#4B8BFF]">Vytvoriť firemný účet <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/security" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/35 px-6 text-sm font-bold text-white transition hover:bg-white/10">Ako chránime vaše dáta</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28"><h2 className="mx-auto max-w-4xl text-center text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl lg:text-[60px]">Dôveryhodne vyzerajúce podvody, ktoré nútia konať hneď</h2><div className="mt-14 grid gap-4 lg:grid-cols-3">{PROTECTION_AREAS.map(({ icon: Icon, label, title, text, href }) => <article key={title} className="flex min-h-[410px] flex-col rounded-2xl border border-[#DFE6F7] bg-[#F4F6FF] p-7 sm:p-9"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#2E5BEA] text-white"><Icon className="h-8 w-8" strokeWidth={1.8} /></span><p className="mt-9 text-xs font-bold tracking-[.12em] text-[#7784A5]">{label}</p><h3 className="mt-5 max-w-[290px] text-3xl font-bold leading-[1.08] tracking-[-.045em] text-[#0A2550]">{title}</h3><p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">{text}</p><Link href={href} className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-bold text-[#2563EB]">Ako to funguje <ArrowRight className="h-4 w-4" /></Link></article>)}</div></section>

      <section className="bg-[#081C3B] text-white"><div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-20"><div><h2 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">Vytvorte z bezpečného overenia prirodzený krok pred platbou</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Spoločná história, dôveryhodné kontakty, pripojené schránky a jasná eskalácia pomôžu tímu držať rovnaký štandard pri každej požiadavke.</p><Link href="/security" className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-[#0A2550] transition hover:bg-[#DCEAFF]">Ako chránime vaše dáta <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-3">{BUSINESS_FEATURES.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 rounded-xl border border-white/10 bg-white/[.055] p-5"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#63E6FF]" /><div><h3 className="font-bold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-300">{text}</p></div></div>)}</div></div></section>

      <section className="bg-white"><div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20"><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#EAF2FF]"><Image src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=85" alt="Tím pri pracovnej konzultácii" fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" /></div><div><h2 className="max-w-xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">Chcete mať kontrolu nad citlivými platbami vo firme?</h2><p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">Ukážeme vám, ako FeelsOdd zapadne do vašich schvaľovacích procesov bez zbytočnej zmeny toho, čo už funguje.</p><Link href="/dohodnut-ukazku" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#0A2550] px-6 text-sm font-bold text-[#0A2550] transition hover:border-[#2563EB] hover:bg-[#EAF2FF] hover:text-[#155CD8]">Dohodnúť si ukážku <ArrowRight className="h-4 w-4" /></Link></div></div></section>

      <HomeFaq />

    </div>
  );
}
