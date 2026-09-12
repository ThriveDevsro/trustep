import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const LAYERS = [
  {
    number: "01",
    title: "Tvrdená identita",
    text: "Určí, za koho sa odosielateľ vydáva — banku, dodávateľa, kolegu, úrad alebo známu službu.",
  },
  {
    number: "02",
    title: "Požadovaná akcia",
    text: "Pomenuje, čo má príjemca urobiť: zaplatiť, zmeniť IBAN, prihlásiť sa, poslať kód alebo prezradiť údaje.",
  },
  {
    number: "03",
    title: "Zhoda identity",
    text: "Porovná dostupné kontakty, domény a kontext s tým, čo o sebe odosielateľ tvrdí.",
  },
  {
    number: "04",
    title: "Sociálne inžinierstvo",
    text: "Rozpozná autoritu, časový tlak, utajenie, naliehavosť a ďalšie spôsoby ovplyvňovania rozhodnutia.",
  },
  {
    number: "05",
    title: "Technické signály",
    text: "Preverí doménu, presmerovania, formuláre a ďalšie merateľné znaky, ktoré tvrdenie podporujú alebo spochybňujú.",
  },
];

export default function ProductPage() {
  return (
    <div className="bg-white text-[#0F172A]">
      <section className="relative min-h-[660px] overflow-hidden bg-[#1264F3] text-white">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[56%]">
          <Image
            src="/truststep-human-hero-v1.png"
            alt="Používateľka si overuje digitálnu komunikáciu"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 56vw"
            className="object-cover object-[67%_50%]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#1264F3_0%,#1264F3_43%,rgba(18,100,243,.48)_66%,rgba(18,100,243,.04)_100%)]" />
        <div className="relative mx-auto flex min-h-[660px] max-w-[1240px] items-center px-5 py-20 sm:px-8">
          <div className="max-w-[680px]">
            <h1 className="text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[72px]">
              Krok medzi podozrením a rozhodnutím
            </h1>
            <p className="mt-7 max-w-[580px] text-lg leading-8 text-blue-100">
              FEELSODD overí, kto je za komunikáciou, čo od vás žiada a či je
              bezpečné podľa tejto požiadavky konať.
            </p>
            <Link
              href="/vyskusat"
              className="mt-10 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#1747B8]"
            >
              Overiť komunikáciu <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
          Päť vrstiev jednej dôveryhodnej odpovede
        </h2>
        <div className="mt-14 border-y border-slate-200">
          {LAYERS.map(({ number, title, text }) => (
            <article
              key={title}
              className="grid gap-3 border-b border-slate-200 py-7 last:border-b-0 sm:grid-cols-[64px_230px_1fr] sm:items-start sm:gap-8"
            >
              <span className="text-sm font-semibold text-[#2563EB]">{number}</span>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#111318] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <div>
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Nie percento. Rozhodnutie podložené dôvodmi
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-300">
              Report oddeľuje tvrdenú identitu, manipulatívny zámer a technické
              zistenia, aby bolo jasné, z čoho odporúčanie vychádza.
            </p>
          </div>
          <dl className="border-t border-white/20">
            <div className="grid gap-3 border-b border-white/20 py-6 sm:grid-cols-[170px_1fr]">
              <dt className="text-sm text-slate-400">Výsledok</dt>
              <dd className="font-semibold text-[#FCA5A5]">STOP AND VERIFY</dd>
            </div>
            <div className="grid gap-3 border-b border-white/20 py-6 sm:grid-cols-[170px_1fr]">
              <dt className="text-sm text-slate-400">Tvrdená identita</dt>
              <dd className="text-sm leading-7 text-slate-200">Vaša banka · identita sa nezhoduje s oficiálnym kanálom</dd>
            </div>
            <div className="grid gap-3 border-b border-white/20 py-6 sm:grid-cols-[170px_1fr]">
              <dt className="text-sm text-slate-400">Zistené signály</dt>
              <dd className="text-sm leading-7 text-slate-200">Časový tlak, žiadosť o prístup a podozrivá doména</dd>
            </div>
            <div className="grid gap-3 py-6 sm:grid-cols-[170px_1fr]">
              <dt className="text-sm text-slate-400">Odporúčanie</dt>
              <dd className="text-lg font-medium leading-8">Nepokračujte. Požiadavku overte priamo v bankovej aplikácii.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="bg-[#E8F0FF] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
            Zistite, čomu môžete veriť ešte pred ďalším krokom
          </h2>
          <Link
            href="/vyskusat"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white"
          >
            Overiť komunikáciu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
