'use client'

import Link from 'next/link'
import { AlertOctagon, ArrowRight, Building2, Mail, MessageSquare, Phone } from 'lucide-react'

const SCAMS = [
  {
    icon: Mail,
    title: 'Phishing a falošné bankové výzvy',
    description:
      'Útok sa snaží vyvolať stres, kliknutie na link alebo prihlásenie do falošného formulára. Často sa hrá na banku, kuriéra, úrad alebo cloud službu.',
    signals: ['naliehavý tón', 'žiadosť o prihlásenie', 'podobná, ale podvrhnutá doména'],
  },
  {
    icon: Building2,
    title: 'Falošné faktúry a zmena IBAN-u',
    description:
      'Najčastejšia finančná škoda vzniká vtedy, keď správa vyzerá dôveryhodne a len „technicky“ mení účet alebo sumu úhrady.',
    signals: ['zmena účtu na poslednú chvíľu', 'nový IBAN bez telefonického potvrdenia', 'apel na diskrétnosť alebo rýchlosť'],
  },
  {
    icon: MessageSquare,
    title: 'Impersonácia kolegu alebo manažéra',
    description:
      'Útočník sa vydáva za interného človeka a tlačí na okamžitú reakciu. Práve tento typ útoku býva nebezpečný, lebo technicky nemusí pôsobiť podozrivo.',
    signals: ['nezvyčajný tón', 'obídenie štandardného procesu', 'požiadavka mimo bežného kontextu'],
  },
  {
    icon: Phone,
    title: 'Vishing a hlasové podvody',
    description:
      'Telefonát alebo hlasová správa využíva autoritu a časový tlak. Často dopĺňa e-mailový podvod a má potvrdiť, že zmena účtu alebo prevod je legitímny.',
    signals: ['tlak na okamžité potvrdenie', 'odmietanie spätného overenia', 'silná manipulácia cez autoritu'],
  },
]

export default function ScamTypesPage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-teal-500 selection:text-white">
      <main>
        <section className="bg-white border-b border-gray-200/50 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 rounded-full px-4 py-1.5 mb-6 shadow-sm">
                <AlertOctagon className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wider">Typy podvodov</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Najčastejšie scenáre, na ktorých firmy strácajú peniaze a čas
              </h1>
              <p className="text-lg text-gray-500 font-medium mt-5 leading-relaxed max-w-2xl">
                Silné konkurenčné weby rozdeľujú obsah podľa attack type a use case. Je to správne, lebo zákazník sa
                často nespozná v “platforme”, ale spozná sa vo vlastnom probléme.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-6">
              {SCAMS.map((scam) => {
                const Icon = scam.icon

                return (
                  <div key={scam.title} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                    <div className="inline-flex items-center justify-center p-3 bg-red-50 rounded-2xl mb-5 text-red-600 border border-red-100">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">{scam.title}</h2>
                    <p className="text-gray-500 font-medium leading-relaxed mb-5">{scam.description}</p>
                    <div className="space-y-3">
                      {scam.signals.map((signal) => (
                        <div key={signal} className="bg-slate-50 rounded-2xl border border-gray-200 p-4">
                          <p className="text-gray-700 font-medium leading-relaxed">{signal}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-10 bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
                Máte podozrenie na jeden z týchto scenárov?
              </h2>
              <p className="text-gray-500 font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
                TrustStep je navrhnutý tak, aby pomohol aj bez veľkej bezpečnostnej expertízy. Vložte správu a nechajte
                systém vysvetliť riziko v normálnom jazyku.
              </p>
              <Link
                href="/submit"
                className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold text-[16px] transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]"
              >
                Overiť podozrivý obsah <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

    </div>
  )
}
