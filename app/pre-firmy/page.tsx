import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, FileSearch, Mail, ReceiptText, ShieldCheck, UsersRound } from "lucide-react";

const TEAMS = ["Financie", "Účtovníctvo", "Nákup", "Vedenie", "Podpora"];

const CASES = [
  {
    title: "Zmenený IBAN na faktúre",
    text: "Tím preverí nový účet, identitu odosielateľa a predošlú komunikáciu ešte pred úhradou.",
  },
  {
    title: "Urgentná správa od vedenia",
    text: "Neobvyklú žiadosť o platbu alebo údaje možno overiť bez odpovede v pôvodnom kanáli.",
  },
  {
    title: "Podozrivý odkaz v e-maile",
    text: "FEELSODD skontroluje skutočnú doménu, presmerovania a cieľ formulára pred otvorením.",
  },
  {
    title: "Incident v zdieľanej schránke",
    text: "Výsledok, dôvody a ďalší krok zostanú dostupné aj pre kolegu, ktorý prípad prevezme.",
  },
];

const SOLUTIONS = [
  {
    icon: ReceiptText,
    title: "Kontrola platieb a faktúr",
    text: "Overte zmenu IBAN, nového príjemcu alebo nečakanú faktúru pred schválením platby.",
    href: "/ako-to-funguje",
  },
  {
    icon: ShieldCheck,
    title: "Overenie identity odosielateľa",
    text: "Porovnajte novú požiadavku s dôveryhodnými kontaktmi a kontextom, ktorý už tím pozná.",
    href: "/ako-to-funguje",
  },
  {
    icon: FileSearch,
    title: "Zdieľaný proces pre celý tím",
    text: "Zachyťte dôvody, rozhodnutia a eskalácie na jednom mieste — aj keď prípad prevezme kolega.",
    href: "/dohodnut-ukazku",
  },
];

const FAQ = [
  [
    "Musíme meniť existujúci e-mail alebo IT systém?",
    "Nie. Začať môžete ručným overovaním konkrétnych podnetov. Schránku alebo ďalšiu integráciu pripojíte až vtedy, keď vám to dáva zmysel.",
  ],
  [
    "Číta FEELSODD celú firemnú poštu?",
    "Nie. Prístup je obmedzený na dohodnutý rozsah a pripojenie schránky možno kedykoľvek odvolať.",
  ],
  [
    "Ako vyzerá pilot?",
    "Vyberieme jeden konkrétny proces, napríklad kontrolu zmien platobných údajov, a výsledky vyhodnotíme na reálnych prípadoch.",
  ],
];

export default function ForCompaniesPage() {
  return (
    <div className="bg-white text-[#0F172A]">
      <section className="relative min-h-[680px] overflow-hidden bg-[#0B3E9B] text-white">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]">
          <Image
            src="/truststep-invoice-review.png"
            alt="Tím kontroluje faktúru pred úhradou"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0B3E9B_0%,#0B3E9B_42%,rgba(11,62,155,.56)_66%,rgba(11,62,155,.05)_100%)]" />
        <div className="relative mx-auto flex min-h-[680px] max-w-[1240px] items-center px-5 py-20 sm:px-8">
          <div className="max-w-[690px]">
            <h1 className="text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[72px]">
              Je to naozaj váš dodávateľ, šéf alebo partner?
            </h1>
            <p className="mt-7 max-w-[590px] text-lg leading-8 text-blue-100">
              FEELSODD overí identitu za nečakanou požiadavkou skôr, než tím
              zmení IBAN, odošle citlivé údaje alebo schváli platbu.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:hello@truststep.sk?subject=Firemný pilot FEELSODD"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#1747B8]"
              >
                Dohodnúť pilot <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/ako-to-funguje"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/60 px-6 text-sm font-semibold"
              >
                Ako to funguje
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-12 gap-y-4 px-5 py-8 sm:px-8">
          <span className="text-sm text-slate-500">Pre ľudí, ktorí rozhodujú:</span>
          {TEAMS.map((team) => (
            <span key={team} className="text-sm font-semibold text-slate-800">
              {team}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:gap-20">
          <div>
            <h2 className="max-w-xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Jeden bezpečný postup naprieč celou firmou
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Či príde zmena platby e-mailom, správa do telefónu alebo faktúra do zdieľanej schránky, tím pracuje s rovnakým kontextom a jasným ďalším krokom.
            </p>
            <Link href="/ako-to-funguje" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#0A2550] px-6 text-sm font-bold text-[#0A2550] transition hover:border-[#2563EB] hover:bg-[#EAF2FF] hover:text-[#155CD8]">
              Pozrieť postup <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="col-span-2 flex min-h-[190px] flex-col justify-between rounded-2xl bg-[#1264F3] p-6 text-white sm:min-h-[220px] sm:p-8">
              <span className="text-sm font-bold text-blue-100">Citlivá platobná zmena</span>
              <div><p className="font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Nový IBAN</p><p className="mt-2 text-sm text-blue-100">Overiť mimo pôvodného e-mailu.</p></div>
            </div>
            <div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-[#EAF2FF] sm:min-h-[220px]"><Image src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85" alt="Kontrola správy na pracovnom zariadení" fill sizes="(min-width: 1024px) 18vw, 50vw" className="object-cover" /></div>
            <div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-[#EAF2FF] sm:min-h-[220px]"><Image src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85" alt="Kontrola finančných dokumentov" fill sizes="(min-width: 1024px) 18vw, 50vw" className="object-cover" /></div>
            <div className="relative col-span-2 min-h-[190px] overflow-hidden rounded-2xl bg-[#EAF2FF] sm:min-h-[220px]"><Image src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=85" alt="Tím rozhoduje spoločne" fill sizes="(min-width: 1024px) 36vw, 100vw" className="object-cover object-center" /></div>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F9FC]">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-3xl">
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Jeden postup pre situácie, kde sa neoplatí hádať
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              FeelsOdd prepája kontrolu platby, identity a tímového rozhodnutia bez toho, aby ste museli meniť zaužívaný spôsob práce.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {SOLUTIONS.map(({ icon: Icon, title, text, href }) => (
              <article key={title} className="flex min-h-[370px] flex-col rounded-2xl border border-slate-200 bg-white p-7 sm:p-8">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#EAF2FF] text-[#2563EB]"><Icon className="h-6 w-6" strokeWidth={1.8} /></span>
                <h3 className="mt-12 max-w-xs text-2xl font-bold leading-8 tracking-[-.035em] text-[#0A2550]">{title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">{text}</p>
                <Link href={href} className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-bold text-[#155CD8]">Zistiť viac <ArrowRight className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[1fr_.85fr] lg:items-end">
          <h2 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
            Situácie, ktoré e-mailový filter nevyrieši
          </h2>
          <p className="max-w-lg text-base leading-8 text-slate-600 lg:justify-self-end">
            Správa môže prísť aj zo skutočného účtu. Rizikom je vydávanie sa za
            dôveryhodnú osobu a požiadavka vykonaná bez druhého overenia.
          </p>
        </div>
        <div className="mt-14 grid border-y border-slate-200 md:grid-cols-2">
          {CASES.map(({ title, text }, index) => (
            <article
              key={title}
              className={`min-h-[260px] py-8 md:p-9 ${index % 2 === 0 ? "md:border-r md:border-slate-200" : ""} ${index < 2 ? "border-b border-slate-200" : ""}`}
            >
              <span className="text-sm font-semibold text-[#2563EB]">0{index + 1}</span>
              <h3 className="mt-7 text-2xl font-semibold">{title}</h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#1264F3] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <div>
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Začnite jedným procesom. Nie veľkým IT projektom
            </h2>
            <p className="mt-6 text-base leading-8 text-blue-100">
              Pilot môže začať bez integrácie. Tím vloží podnet manuálne a až
              reálne výsledky ukážu, kde má automatizácia zmysel.
            </p>
          </div>
          <div className="grid overflow-hidden rounded-2xl bg-[#0B3E9B] sm:grid-cols-3">
            <div className="flex min-h-[250px] flex-col border-b border-white/15 p-7 sm:border-b-0 sm:border-r">
              <ReceiptText className="h-7 w-7" />
              <p className="mt-auto pt-10 text-xl font-semibold">Vyberieme citlivý proces</p>
            </div>
            <div className="flex min-h-[250px] flex-col border-b border-white/15 p-7 sm:border-b-0 sm:border-r">
              <UsersRound className="h-7 w-7" />
              <p className="mt-auto pt-10 text-xl font-semibold">Zapojíme ľudí, ktorí rozhodujú</p>
            </div>
            <div className="flex min-h-[250px] flex-col p-7">
              <Mail className="h-7 w-7" />
              <p className="mt-auto pt-10 text-xl font-semibold">Pripojíme schránku až podľa potreby</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC]">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Výsledok, ktorý sa dá posunúť aj obhájiť
            </h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
              Každé overenie ukáže, čo bolo nájdené, z čoho záver vychádza a
              čo má tím urobiť ďalej.
            </p>
          </div>
          <ul className="border-t border-slate-300">
            {[
              "Spoločná história overení a rozhodnutí",
              "Konkrétne dôvody namiesto nejasného skóre",
              "Jasný vlastník prípadu a možnosť eskalácie",
              "Kontrola nad tým, ktoré schránky a dáta sú pripojené",
            ].map((item) => (
              <li key={item} className="flex gap-3 border-b border-slate-300 py-5 text-sm font-medium">
                <Check className="mt-0.5 h-4 w-4 text-[#2563EB]" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[920px] px-5 py-20 sm:px-8 sm:py-28">
          <h2 className="text-center font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
            Často kladené otázky
          </h2>
          <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
            {FAQ.map(([question, answer]) => (
              <article key={question} className="py-7">
                <h3 className="text-lg font-semibold">{question}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{answer}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href="mailto:hello@truststep.sk?subject=Firemný pilot FEELSODD"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white"
            >
              Porozprávať sa o pilote <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
