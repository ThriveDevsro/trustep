import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Globe2, Mail, MessageSquareText } from "lucide-react";

const SCENARIOS = [
  {
    icon: MessageSquareText,
    title: "Správa o balíku alebo nedoplatku",
    text: "Vyzerá bežne, ale núti vás kliknúť a zaplatiť malú sumu ešte dnes.",
    href: "/vyskusat?tab=sms",
  },
  {
    icon: Mail,
    title: "E-mail z banky alebo služby",
    text: "Pozná vaše meno a používa správne logo. Odosielateľ alebo odkaz však môžu byť iné.",
    href: "/vyskusat?tab=email",
  },
  {
    icon: Globe2,
    title: "Odkaz z bazára alebo sociálnej siete",
    text: "Kupujúci vás presúva mimo platformy alebo odkaz vedie na falošnú platobnú stránku.",
    href: "/vyskusat?tab=url",
  },
];

const POINTS = [
  "Správy, chaty a sociálne siete",
  "Odkazy, e-shopy a prihlasovacie stránky",
  "Tvrdené identity firiem, značiek a odosielateľov",
  "PDF, faktúry, prílohy a screenshoty",
];

export default function ForPeoplePage() {
  return (
    <div className="bg-white text-[#0F172A]">
      <section className="relative min-h-[680px] overflow-hidden bg-[#1264F3] text-white sm:min-h-[720px]">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]">
          <Image
            src="/truststep-human-hero-v1.png"
            alt="Používateľka si overuje nečakanú správu"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover object-[67%_50%]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#1264F3_0%,#1264F3_43%,rgba(18,100,243,.48)_66%,rgba(18,100,243,.05)_100%)]" />
        <div className="relative mx-auto flex min-h-[680px] max-w-[1240px] items-center px-5 py-20 sm:min-h-[720px] sm:px-8">
          <div className="max-w-[650px]">
            <h1 className="text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[74px]">
              Zistite, kto sa vám ozýva, skôr než zareagujete
            </h1>
            <p className="mt-7 max-w-[570px] text-lg leading-8 text-blue-50">
              FEELSODD posúdi, za koho sa správa vydáva, čo od vás žiada a či
              je bezpečné kliknúť, odpovedať alebo zaplatiť.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/vyskusat"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#1747B8]"
              >
                Overiť komunikáciu <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/cennik"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/65 px-6 text-sm font-semibold text-white"
              >
                Pozrieť plány
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[1fr_.85fr] lg:items-end">
          <h2 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
            Podvod sa často tvári ako obyčajný deň
          </h2>
          <p className="max-w-lg text-base leading-8 text-slate-600 lg:justify-self-end">
            Balík, banka, bazár alebo „podpora“. FEELSODD overí konkrétne
            tvrdenie a požiadavku — nie abstraktnú hrozbu.
          </p>
        </div>
        <div className="mt-14 grid border-y border-slate-200 md:grid-cols-3 md:divide-x md:divide-slate-200">
          {SCENARIOS.map(({ icon: Icon, title, text, href }) => (
            <article key={title} className="flex min-h-[330px] flex-col py-8 md:px-8">
              <Icon className="h-7 w-7 text-[#2563EB]" strokeWidth={1.7} />
              <h3 className="mt-8 text-2xl font-semibold leading-8">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
              <Link
                href={href}
                className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-[#2563EB]"
              >
                Overiť <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#111318] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src="/truststep-human-hero-v1.png"
              alt="Žena pokojne kontroluje správu v telefóne"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-[64%_50%]"
            />
          </div>
          <div>
            <h2 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Pomôžte aj rodičom bez toho, aby ste boli stále na telefóne
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-300">
              Každý člen rodiny môže podnet overiť samostatne a výsledok vám
              poslať vtedy, keď potrebuje druhý názor.
            </p>
            <ul className="mt-9 border-t border-white/20">
              {POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-3 border-b border-white/20 py-4 text-sm font-medium"
                >
                  <Check className="h-4 w-4 text-[#60A5FA]" /> {point}
                </li>
              ))}
            </ul>
            <Link
              href="/cennik"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#60A5FA]"
            >
              Pozrieť rodinný plán <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#E8F0FF] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl">
              Máte podozrivú správu už teraz?
            </h2>
            <p className="mt-4 text-base text-slate-700">
              Vložte ju do FEELSODD a rozhodnite sa až po overení.
            </p>
          </div>
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
