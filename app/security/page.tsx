import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const PRINCIPLES = [
  {
    title: "Používame iba to, čo je potrebné",
    text: "Na overenie nepotrebujeme vaše heslo, PIN, autorizačný kód ani celé údaje platobnej karty.",
  },
  {
    title: "Obsah nepredávame na reklamu",
    text: "Správy a dokumenty, ktoré vložíte na analýzu, nepoužívame na behaviorálne reklamné profily.",
  },
  {
    title: "Výsledok vysvetľujeme",
    text: "FEELSODD ukáže konkrétne signály a odporúčanie. Automatický výstup nie je právne ani finančné rozhodnutie.",
  },
  {
    title: "Kontrola zostáva u vás",
    text: "Pripojenie schránky je dobrovoľné, má obmedzený rozsah a môžete ho kedykoľvek odvolať.",
  },
];

export default function SecurityPage() {
  return (
    <div className="bg-white text-[#0F172A]">
      <section className="bg-[#E8F0FF]">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
          <h1 className="max-w-5xl text-balance font-display text-5xl font-semibold leading-[.99] tracking-[-.06em] sm:text-6xl lg:text-[72px]">
            Dôvera začína tým, ako pracujeme s vašimi údajmi
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700">
            FEELSODD je navrhnutý na overenie citlivej komunikácie. Preto
            minimalizujeme údaje, vysvetľujeme automatické výsledky a dávame vám
            kontrolu nad tým, čo zostane uložené.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid border-y border-slate-200 md:grid-cols-2">
          {PRINCIPLES.map(({ title, text }, index) => (
            <article
              key={title}
              className={`min-h-[260px] py-8 md:p-9 ${index % 2 === 0 ? "md:border-r md:border-slate-200" : ""} ${index < 2 ? "border-b border-slate-200" : ""}`}
            >
              <span className="text-sm font-semibold text-[#2563EB]">0{index + 1}</span>
              <h2 className="mt-7 text-2xl font-semibold">{title}</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#111318] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.85fr_1.15fr] lg:gap-24">
          <div>
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              AI pomáha vyhodnotiť situáciu. Nerozhoduje za vás
            </h2>
          </div>
          <div>
            <p className="text-base leading-8 text-slate-300">
              Výsledok kombinuje modely umelej inteligencie s technickými
              kontrolami. Môže byť neúplný alebo nesprávny, preto pri platbe či
              odovzdaní údajov odporúčame nezávislé potvrdenie cez oficiálny kanál.
            </p>
            <ul className="mt-8 border-t border-white/20">
              {[
                "Konkrétne dôvody namiesto nevysvetleného skóre",
                "Rizikové farby používame iba vo výsledku",
                "Možnosť nahlásiť nesprávne vyhodnotenie",
                "Citlivé údaje môžete pred odoslaním odstrániť alebo prekryť",
              ].map((item) => (
                <li key={item} className="flex gap-3 border-b border-white/20 py-5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 text-[#60A5FA]" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
              Úplné právne informácie
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Pozrite si, aké údaje spracúvame, prečo ich potrebujeme, ako dlho
              ich uchovávame a aké práva môžete uplatniť.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/ochrana-sukromia" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
              Ochrana osobných údajov <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/podmienky-pouzivania" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
              Podmienky používania <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
