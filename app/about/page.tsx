import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PRINCIPLES = [
  {
    title: "Najprv zrozumiteľnosť",
    text: "Výsledok musí povedať, čo nesedí, prečo je to dôležité a čo môžete urobiť ďalej — bez bezpečnostného žargónu.",
  },
  {
    title: "Dôvody pred skóre",
    text: "Číslo bez kontextu nepomáha rozhodnúť sa. Každé odporúčanie preto spájame s konkrétnymi zisteniami.",
  },
  {
    title: "Človek má posledné slovo",
    text: "Automatická analýza je druhý názor. Skutočné rozhodnutie a nezávislé overenie vždy zostávajú vo vašich rukách.",
  },
  {
    title: "Minimum potrebných údajov",
    text: "Na overenie nepotrebujeme heslo, PIN, autorizačný kód ani celé údaje platobnej karty.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white text-[#0F172A]">
      <section className="bg-[#1264F3] text-white">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
          <h1 className="max-w-5xl text-balance font-display text-5xl font-semibold leading-[.99] tracking-[-.06em] sm:text-6xl lg:text-[72px]">
            Budujeme miesto, kde sa dôvera najprv overí
          </h1>
          <div className="mt-12 grid gap-8 border-t border-white/30 pt-8 lg:grid-cols-[1.2fr_.8fr]">
            <p className="max-w-3xl text-lg leading-8 text-blue-50">
              Digitálna komunikácia vie napodobniť značku, hlas aj spôsob, akým
              píše známy človek. FEELSODD vzniká preto, aby medzi pochybnosťou
              a konaním existoval jeden pokojný krok navyše.
            </p>
            <p className="font-display text-3xl font-semibold leading-10 lg:text-right">
              Verify before you trust.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <p className="max-w-[1080px] text-balance font-display text-4xl font-medium leading-[1.08] tracking-[-.052em] sm:text-5xl lg:text-[62px]">
          Nechránime iba zariadenie. Pomáhame chrániť rozhodnutie, ktoré človek
          urobí po správe, odkaze alebo žiadosti o platbu.
        </p>
      </section>

      <section className="bg-[#E8F0FF]">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.72fr_1.28fr] lg:gap-24">
          <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
            Podľa čoho FEELSODD staviame
          </h2>
          <div className="border-t border-[#AEC4EE]">
            {PRINCIPLES.map(({ title, text }, index) => (
              <article
                key={title}
                className="grid gap-3 border-b border-[#AEC4EE] py-7 sm:grid-cols-[46px_1fr]"
              >
                <span className="text-sm font-semibold text-[#2563EB]">0{index + 1}</span>
                <div className="grid gap-3 md:grid-cols-[.8fr_1.2fr] md:gap-8">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-sm leading-7 text-slate-700">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#111318] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Chcete FEELSODD vyskúšať vo svojom tíme?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Ozvite sa, ak riešite faktúry, dodávateľské požiadavky alebo citlivú komunikáciu bez vlastného bezpečnostného tímu.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4">
            <a href="mailto:hello@truststep.sk" className="inline-flex items-center gap-2 text-lg font-semibold text-[#60A5FA]">
              hello@truststep.sk <ArrowRight className="h-5 w-5" />
            </a>
            <Link href="/pre-firmy" className="text-sm font-semibold text-slate-300">
              Pozrieť riešenie pre firmy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
