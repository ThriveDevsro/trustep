'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  CreditCard,
  FileText,
  Link2,
  MessageSquareWarning,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react'
import { AppDownloadButtons } from '@/components/AppDownloadButtons'

const SCAM_SITUATIONS = [
  { icon: FileText, title: 'Nový účet na faktúre', text: 'Skontrolujte zmenu skôr, než odošlete platbu', card: 'bg-[#fff1e9]', iconTone: 'text-[#f05a22]' },
  { icon: MessageSquareWarning, title: 'Naliehavá správa', text: 'Overte, kto od vás naozaj žiada rýchlu reakciu', card: 'bg-[#e9f0ff]', iconTone: 'text-[#2563eb]' },
  { icon: Link2, title: 'Neznámy odkaz', text: 'Pozrite sa, kam link smeruje ešte pred otvorením', card: 'bg-[#f2edff]', iconTone: 'text-[#7657d5]' },
  { icon: CreditCard, title: 'Nečakaná platba', text: 'Zistite, či požiadavka dáva zmysel a čo urobiť ďalej', card: 'bg-[#e5f7f3]', iconTone: 'text-[#087b70]' },
] as const

export default function LandingPage() {
  return (
    <div className="flex flex-col overflow-hidden bg-[#f7f8fa] text-[#07152d]">
      <section className="relative isolate min-h-[690px] overflow-hidden bg-white text-[#07152d]">
        <div className="absolute -right-48 -top-56 h-[600px] w-[600px] rounded-full bg-[#ffefe8]" />
        <div className="absolute right-[34%] top-24 h-4 w-4 rotate-12 rounded-sm bg-[#ff5b19]" />
        <div className="absolute bottom-20 left-[47%] h-12 w-12 rounded-full border-[10px] border-blue-600/15" />

        <div className="relative mx-auto grid max-w-[1280px] items-center gap-8 px-6 pb-20 pt-16 lg:grid-cols-[.82fr_1.18fr] lg:px-8 lg:pb-24 lg:pt-20">
          <div className="max-w-[650px]">
            <h1 className="text-balance text-[3.35rem] font-extrabold leading-[.94] tracking-[-.07em] sm:text-7xl lg:text-[4.9rem] xl:text-[5.3rem]">
              <span className="block whitespace-nowrap">Nenechajte sa</span>
              <span className="block">nachytať</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg font-medium leading-8 text-slate-600 sm:text-xl">
              Prišla podozrivá správa, link alebo faktúra? TrustStep ju preverí skôr, než kliknete alebo zaplatíte.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/submit" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5b19] px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_35px_rgba(255,91,25,.3)] transition hover:bg-[#ff7139]">
                Overiť správu
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/3] w-full max-w-[760px] lg:-mr-14 lg:scale-110">
            <Image
              src="/truststep-hero-v3.png"
              alt="Človek bezpečne preveruje podozrivú správu cez TrustStep"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="relative z-10 object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">Keď vám niečo nesedí</h2>
            <p className="max-w-md text-sm font-medium leading-6 text-slate-600">Štyri situácie, v ktorých sa oplatí zastaviť pred kliknutím alebo platbou</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SCAM_SITUATIONS.map(({ icon: Icon, title, text, card, iconTone }, index) => (
              <article key={title} className={`group relative min-h-[390px] overflow-hidden rounded-[2rem] p-6 text-[#07152d] transition-transform hover:-translate-y-2 sm:p-7 ${card}`}>
                <div className="absolute right-5 top-5 h-3 w-3 rounded-full bg-white/80" />
                <div className={`relative mt-6 grid h-44 place-items-center transition-transform group-hover:-rotate-3 group-hover:scale-105 ${iconTone}`}>
                  <Icon className="h-28 w-28" strokeWidth={1.05} />
                  <span className={`absolute h-36 w-36 rounded-full border border-current opacity-20 ${index % 2 === 0 ? '-rotate-6' : 'rotate-6'}`} />
                  <span className="absolute bottom-1 right-10 h-5 w-5 rotate-45 border-2 border-current opacity-50" />
                </div>
                <div className="absolute inset-x-6 bottom-7 sm:inset-x-7">
                  <h3 className="text-xl font-extrabold leading-tight tracking-[-.04em]">{title}</h3>
                  <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{text}</p>
                  <Link href="/submit" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold">Overiť <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>



      <section className="order-1 border-y border-slate-200 bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <h2 className="text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">Ako TrustStep odpovie</h2>
            <p className="max-w-lg text-sm font-medium leading-6 text-slate-600 lg:ml-auto">Namiesto technického reportu dostanete tri odpovede, podľa ktorých sa dá hneď rozhodnúť</p>
          </div>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {[
              ['01', 'Je to rizikové', 'Jasný verdikt a úroveň rizika bez zbytočného odborného slovníka'],
              ['02', 'Prečo si to myslí', 'Konkrétne podozrivé signály označené priamo v správe alebo dokumente'],
              ['03', 'Čo urobiť ďalej', 'Bezpečný ďalší krok: neklikať, neplatiť, overiť kontakt alebo eskalovať'],
            ].map(([number, title, text]) => (
              <article key={number} className="text-center">
                <div className="relative mx-auto grid h-48 w-48 place-items-center rounded-full border-2 border-[#07152d] bg-white shadow-[9px_9px_0_#ff5b19] transition-transform hover:-translate-y-2 sm:h-52 sm:w-52">
                  <div className="absolute inset-3 rounded-full border border-slate-200" />
                  <span className="relative text-6xl font-extrabold tracking-[-.08em] text-[#07152d]">{number}</span>
                </div>
                <h3 className="mt-9 text-xl font-extrabold tracking-[-.035em]">{title}</h3>
                <p className="mx-auto mt-3 max-w-[290px] text-sm font-medium leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="order-3 bg-[#f4f6f8] py-24 sm:py-28">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="relative min-h-[380px] w-full lg:min-h-[470px]">
            <Image src="/truststep-testimonial-v2.png" alt="Dvaja ľudia spolu preverujú podozrivú správu v mobile" fill sizes="50vw" className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[.18em] text-[#ff5b19]">Prečo to ľudia používajú</p>
            <blockquote className="mt-6 text-balance text-3xl font-extrabold leading-[1.2] tracking-[-.045em] sm:text-4xl xl:text-5xl">
              „Nemusím rozumieť kyberbezpečnosti, aby som vedel, či mám zastaviť platbu alebo zavolať kolegovi“
            </blockquote>
            <p className="mt-7 text-sm font-bold text-slate-500">Typická situácia používateľa TrustStep</p>
          </div>
        </div>
      </section>

      <section className="order-3 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#ff5b19]">FAQ</p><h2 className="mt-4 text-4xl font-extrabold tracking-[-.05em] text-[#07152d] sm:text-5xl">Často sa pýtate</h2></div>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {[
              ['Čo môžem cez TrustStep overiť', 'E-mail, SMS, webový odkaz, snímku obrazovky aj faktúru alebo platobný pokyn', 'bg-[#fff1e9]'],
              ['Musím si niečo inštalovať', 'Nie, kontrolu môžete spustiť priamo na webe z mobilu aj počítača', 'bg-[#e9f0ff]'],
              ['Nahrádza TrustStep bezpečnostný tím', 'Nie, pomáha rýchlo rozpoznať riziko a dôležitý prípad správne eskalovať', 'bg-[#f2edff]'],
              ['Môže TrustStep používať celý tím', 'Áno, firemné riešenie dá zamestnancom jednoduchú kontrolu a bezpečnostnému tímu spoločný prehľad', 'bg-[#e5f7f3]'],
            ].map(([question, answer, color]) => (
              <article key={question} className={`relative min-h-[230px] overflow-hidden rounded-[1.7rem] p-7 text-[#07152d] sm:p-9 ${color}`}>
                <span className="absolute right-7 top-6 grid h-11 w-11 place-items-center rounded-full bg-white/75 text-xl font-extrabold">?</span>
                <h3 className="max-w-[75%] text-xl font-extrabold leading-tight tracking-[-.03em]">{question}</h3>
                <p className="mt-10 max-w-md text-sm font-medium leading-7 text-slate-600">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

    <section className="order-2 bg-white px-6 py-20 sm:py-28 lg:px-8">
        <div className="relative mx-auto grid min-h-[520px] max-w-[1180px] items-center overflow-hidden rounded-[2.2rem] bg-[radial-gradient(circle_at_75%_45%,#123c55_0%,#08273c_30%,#06192d_70%)] px-7 pt-14 text-white sm:px-12 lg:grid-cols-[.9fr_1.1fr] lg:px-16 lg:py-16">
          <div className="relative z-10 pb-12 lg:pb-0">
            <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#ff7a42]">TrustStep v mobile</p>
            <h2 className="mt-5 max-w-xl text-balance text-4xl font-extrabold leading-[1.02] tracking-[-.055em] sm:text-6xl">Ochrana, ktorú máte vždy pri sebe</h2>
            <p className="mt-6 max-w-lg text-base font-medium leading-7 text-slate-300">Odfoťte podozrivú správu, vložte link alebo prepošlite e-mail. Výsledok dostanete priamo v aplikácii.</p>
            <div className="mt-8"><AppDownloadButtons /></div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Aplikácie pre iPhone a Android pripravujeme</p>
          </div>

          <div className="relative mx-auto h-[470px] w-full max-w-[520px] self-end">
            <div className="absolute bottom-[-110px] right-[7%] h-[520px] w-[270px] rotate-[7deg] rounded-[3.4rem] border-[8px] border-[#172133] bg-[#05080d] p-2 shadow-[0_35px_80px_rgba(0,0,0,.55)]">
              <div className="relative h-full overflow-hidden rounded-[2.75rem] bg-[#f4f6f8] px-5 pb-6 pt-12 text-[#07152d]">
                <div className="absolute left-1/2 top-3 h-7 w-24 -translate-x-1/2 rounded-full bg-black" />
                <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold">Trust<span className="text-[#ff5b19]">Step</span></span><div className="grid h-7 w-7 place-items-center rounded-full bg-[#07152d]"><ShieldCheck className="h-4 w-4 text-white" /></div></div>
                <p className="mt-7 text-[10px] font-bold text-slate-400">Výsledok kontroly</p>
                <div className="mt-2 rounded-2xl bg-[#07152d] p-5 text-white">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Rizikové skóre</span><span className="text-2xl font-extrabold text-[#ff6a2c]">87</span></div>
                  <div className="mt-4 h-1.5 rounded-full bg-white/10"><div className="h-full w-[87%] rounded-full bg-[#ff5b19]" /></div>
                  <p className="mt-4 text-sm font-extrabold">Platbu neposielajte</p>
                </div>
                <div className="mt-4 space-y-2">
                  {['Nový účet príjemcu', 'Neznámy odosielateľ', 'Tlak na rýchlu úhradu'].map(item => <div key={item} className="flex items-center gap-2 rounded-xl bg-white p-3 text-[9px] font-extrabold shadow-sm"><span className="h-2 w-2 rounded-full bg-[#ff5b19]" />{item}</div>)}
                </div>
                <button type="button" className="mt-5 w-full rounded-xl bg-[#ff5b19] py-3 text-[10px] font-extrabold text-white">Overiť ďalší obsah</button>
              </div>
            </div>
            <div className="absolute bottom-[-145px] right-[42%] h-[430px] w-[225px] -rotate-[8deg] rounded-[3rem] border-[7px] border-[#172133] bg-[#05080d] p-2 shadow-[0_30px_70px_rgba(0,0,0,.45)]">
              <div className="relative h-full overflow-hidden rounded-[2.35rem] bg-white px-5 pt-12 text-[#07152d]">
                <div className="absolute left-1/2 top-3 h-6 w-20 -translate-x-1/2 rounded-full bg-black" />
                <ScanSearch className="h-8 w-8 text-[#ff5b19]" />
                <h3 className="mt-5 text-2xl font-extrabold leading-tight tracking-[-.04em]">Čo chcete preveriť</h3>
                <div className="mt-6 space-y-3">{['E-mail alebo SMS', 'Webový odkaz', 'Fotku či faktúru'].map(item => <div key={item} className="rounded-xl border border-slate-200 p-3 text-[9px] font-extrabold">{item}</div>)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
