'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle, HeartHandshake, Mail, MessageSquare, Phone, Shield } from 'lucide-react'

const USE_CASES = [
  {
    icon: MessageSquare,
    title: 'Podozrivé SMS a kuriérske správy',
    description:
      'Správy o balíku, nedoplatku alebo overení účtu patria medzi najčastejšie podvody na bežných používateľov.',
  },
  {
    icon: Mail,
    title: 'Falošné e-maily od banky alebo služby',
    description:
      'Podvodné e-maily sa tvária dôveryhodne a tlačia na prihlásenie, potvrdenie údajov alebo zaplatenie poplatku.',
  },
  {
    icon: Phone,
    title: 'Telefonáty a hlasové nátlakové scenáre',
    description:
      'Volajúci sa vydáva za banku, kuriéra alebo člena rodiny a snaží sa vyvolať stres, autoritu a rýchlu reakciu.',
  },
] as const

const BENEFITS = [
  'druhý názor pred kliknutím alebo odoslaním platby',
  'zrozumiteľné vysvetlenie bez bezpečnostného žargónu',
  'vhodné aj pre rodičov, seniorov a menej technických používateľov',
  'rýchle použitie bez komplikovaného nastavovania',
] as const

const WHEN_TO_USE = [
  'keď si nie ste istý, či správa patrí banke alebo kuriérovi',
  'keď vás niekto tlačí na rýchlu reakciu, klik alebo platbu',
  'keď marketplace komunikácia posiela na externý link',
  'keď chcete ukázať rodičom alebo známym, prečo je správa podozrivá',
] as const

export default function ForPeoplePage() {
  return (
    <div className="min-h-screen bg-[#f5f8f7] selection:bg-teal-500 selection:text-white">
      <main>
        <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
                  <HeartHandshake className="h-4 w-4" />
                  Pre ľudí
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl lg:leading-[0.98]">
                  Druhý názor pred kliknutím, odpoveďou alebo odoslaním peňazí
                </h1>
                <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-xl">
                  Nie každý podvod cieli na firmu. Veľká časť útokov ide po bežných ľuďoch cez SMS, bazáre, bankové výzvy,
                  kuriérske správy alebo hlasové manipulácie. TrustStep má pomáhať aj tam.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-7 py-4 text-sm font-extrabold text-white transition-colors hover:bg-teal-700"
                  >
                    Spustiť analýzu
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-extrabold text-slate-950 transition-colors hover:bg-slate-50"
                  >
                    Vytvoriť účet
                  </Link>
                </div>
              </div>

              <div className="grid gap-0 border-y border-slate-200">
                <div className="py-7">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Kedy to pomáha najviac</div>
                  <h2 className="mt-3 max-w-lg text-2xl font-extrabold tracking-tight text-slate-950">
                    Najväčší zmysel to má v momente neistoty, nie až po tom, čo sa stane chyba
                  </h2>
                  <div className="mt-5 grid gap-3">
                    {WHEN_TO_USE.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm font-semibold leading-relaxed text-slate-700">
                        <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-teal-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 py-7">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Čo dostanete</div>
                  <h2 className="mt-3 max-w-lg text-2xl font-extrabold tracking-tight text-slate-950">
                    Jednoduchý verdict, dôvody a ďalší krok bez zbytočného žargónu
                  </h2>
                  <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-600">
                    Cieľom nie je vystrašiť používateľa. Cieľom je pomôcť mu pokojne sa zastaviť a spraviť správne rozhodnutie.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 max-w-2xl">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Najčastejšie scenáre</div>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Podvody, ktoré bežní ľudia riešia každý týždeň
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {USE_CASES.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-[#f8fbfa] p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
                    <div className="inline-flex items-center justify-center rounded-2xl bg-teal-100 p-3 text-teal-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="mt-5 text-xl font-extrabold text-slate-950">{item.title}</h2>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{item.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#eef5f3] py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 text-teal-700">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Prečo to funguje</span>
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  Dáva to zmysel presne vtedy, keď nechcete veriť panike ani vlastnému stresu
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                  Namiesto rýchleho rozhodnutia si dáte obsah preveriť a dostanete jednoduché odporúčanie.
                  To je často rozdiel medzi pokojom a drahou chybou.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {BENEFITS.map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <p className="text-sm font-semibold leading-relaxed text-slate-700">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_20px_70px_rgba(15,23,42,0.12)] sm:px-8">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Máte podozrivú správu už teraz?</div>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Skopírujte text alebo vložte link a nechajte si ho vyhodnotiť bez zložitého procesu
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/70 sm:text-base">
                    TrustStep je postavený tak, aby fungoval aj pre menej technických používateľov a aj v strese.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/submit"
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-4 text-sm font-extrabold text-white transition-colors hover:bg-teal-400"
                  >
                    Spustiť analýzu
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/link-check"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-extrabold text-white transition-colors hover:bg-white/10"
                  >
                    Overiť link
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
