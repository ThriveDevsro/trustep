import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Globe2, MessageSquareText, ReceiptText, ShieldCheck } from "lucide-react";

const STEPS = [
  { number: "01", title: "Zachyťte požiadavku", text: "Pošlite e-mail, odkaz, faktúru alebo screenshot presne tak, ako prišiel. Tím nemusí vedieť, aký typ podvodu hľadá.", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=85" },
  { number: "02", title: "Overte súvislosti", text: "FeelsOdd oddelí, kto niečo tvrdí, čo od vás žiada a ktoré signály si vyžadujú nezávislé potvrdenie.", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85" },
  { number: "03", title: "Rozhodnite sa s istotou", text: "Výsledok dá tímu konkrétny ďalší krok: pokračovať, preveriť cez známy kontakt alebo požiadavku zastaviť.", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=85" },
];

const INPUTS = [
  { icon: MessageSquareText, title: "Správa alebo e-mail", text: "Nečakaná žiadosť o platbu, zmenu údajov alebo prístup." },
  { icon: Globe2, title: "Odkaz alebo doména", text: "Prihlasovacia stránka, presmerovanie či platobná brána." },
  { icon: ReceiptText, title: "Faktúra alebo dokument", text: "PDF, screenshot, platobný pokyn alebo zmena IBAN." },
];

export default function HowItWorksPage() {
  return (
    <main className="overflow-hidden bg-white text-[#0A2550]">
      <section className="bg-[#F7F9FC]">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:min-h-[650px] lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:gap-20 lg:py-16">
          <div>
            <h1 className="max-w-2xl text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[74px]">Bezpečný krok pred každým rozhodnutím</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">FeelsOdd dá finančným a prevádzkovým tímom jeden jasný postup pri podozrivej komunikácii — skôr než zmení účet, platbu alebo prístup.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/dohodnut-ukazku" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#155CD8]">Dohodnúť si ukážku <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/security" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 px-6 text-sm font-bold text-[#0A2550] transition hover:border-[#2563EB] hover:bg-[#EAF2FF]">Ako chránime vaše dáta</Link>
            </div>
          </div>
          <div className="relative aspect-[1.15/1] overflow-hidden rounded-2xl bg-[#DCEAFF] shadow-[0_20px_55px_rgba(12,54,120,.12)] lg:aspect-auto lg:min-h-[500px]">
            <Image src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=85" alt="Tím pri spoločnom pracovnom rozhodovaní" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />
            <div className="absolute inset-x-5 bottom-5 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur sm:inset-x-8 sm:bottom-8 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E5F8F0] text-[#159B66]"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-bold text-[#0A2550]">Jasný postup pre celý tím</p><p className="mt-1 text-sm leading-6 text-slate-600">Každá citlivá požiadavka dostane rovnakú kontrolu.</p></div></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-4xl text-center"><h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">Od nečakanej správy k jasnému rozhodnutiu</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">Tri kroky, ktoré dávajú každému v tíme rovnaký postup pri citlivej požiadavke.</p></div>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">{STEPS.map(({ number, title, text, image }) => <article key={number}><div className="relative aspect-[1.05/1] overflow-hidden rounded-2xl bg-[#EAF2FF]"><Image src={image} alt={title} fill sizes="(min-width: 1024px) 31vw, 100vw" className="object-cover" /><span className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-[#0A2550] text-sm font-bold text-white shadow-lg">{number}</span></div><h3 className="mt-7 text-2xl font-bold tracking-[-.035em] text-[#0A2550]">{title}</h3><p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">{text}</p></article>)}</div>
      </section>

      <section className="bg-[#081C3B] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div><h2 className="max-w-lg text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">Pracujte s tým, čo už tím dostáva</h2><p className="mt-6 max-w-md text-lg leading-8 text-slate-300">Pri overovaní nemeníte nástroje ani nemusíte rozpoznávať vzorec podvodu. Pošlite to, čo prišlo.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">{INPUTS.map(({ icon: Icon, title, text }) => <article key={title} className="flex min-h-[250px] flex-col rounded-xl border border-white/10 bg-white/[.055] p-6"><Icon className="h-6 w-6 text-[#63E6FF]" /><h3 className="mt-10 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{text}</p></article>)}</div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#EAF2FF]"><Image src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=85" alt="Tím pri pracovnej konzultácii" fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" /></div>
          <div><h2 className="max-w-xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">Ukážeme vám postup na vašom reálnom prípade</h2><p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">Pozrieme sa na situácie, ktoré váš tím rieši najčastejšie, a ukážeme, ako ich FeelsOdd pomôže bezpečne rozhodnúť.</p><Link href="/dohodnut-ukazku" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#0A2550] px-6 text-sm font-bold text-[#0A2550] transition hover:border-[#2563EB] hover:bg-[#EAF2FF] hover:text-[#155CD8]">Dohodnúť si ukážku <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>
    </main>
  );
}
