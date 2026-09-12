import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeEuro,
  Briefcase,
  Building2,
  AlertCircle,
  Gift,
  HeartHandshake,
  KeyRound,
  Landmark,
  Link2,
  MonitorSmartphone,
  Package,
  Phone,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Typy podvodov | FeelsOdd',
  description: 'Spoznajte najčastejšie online a finančné podvody, ich varovné signály a bezpečný ďalší krok.',
}

interface ScamItem {
  icon: LucideIcon
  title: string
  description: string
  signals: string
  action: string
}

interface ScamGroup {
  id: string
  label: string
  title: string
  intro: string
  items: ScamItem[]
}

const SCAM_GROUPS: ScamGroup[] = [
  {
    id: 'autorita',
    label: 'Dôvera a autorita',
    title: 'Niekto sa vydáva za inštitúciu alebo človeka, ktorého poznáte.',
    intro: 'Meno banky, polície, kolegu či príbuzného má skrátiť vaše rozhodovanie. Skutočná identita sa však nepotvrdzuje tým, čo volajúci o vás vie.',
    items: [
      {
        icon: Landmark,
        title: 'Falošná banka, polícia alebo NBS',
        description: 'Volajúci tvrdí, že váš účet napadli, niekto si na vás berie úver alebo treba peniaze presunúť na „bezpečný účet“.',
        signals: 'Bezpečný účet · tajnosť · konanie počas hovoru',
        action: 'Zložte a zavolajte banke na číslo z jej oficiálneho webu alebo platobnej karty.',
      },
      {
        icon: Users,
        title: 'Rodina z nového čísla',
        description: 'Správa používa meno dieťaťa, partnera alebo známeho. Vysvetľuje pokazený telefón a žiada rýchlu platbu či kód.',
        signals: 'Nové číslo · nečakaná prosba · nemožno zavolať',
        action: 'Kontaktujte človeka cez pôvodné číslo alebo inú osobu z rodiny.',
      },
      {
        icon: Building2,
        title: 'CEO alebo kolega žiada platbu',
        description: 'E-mail vyzerá ako pokyn vedenia firmy. Žiada diskrétny prevod, nákup poukážok alebo obídenie bežného schvaľovania.',
        signals: 'Dôvernosť · nezvyčajný proces · nadriadená autorita',
        action: 'Platbu potvrďte druhým kanálom a podľa interného schvaľovacieho procesu.',
      },
      {
        icon: Phone,
        title: 'Vishing a podvrhnuté číslo',
        description: 'Na displeji sa môže zobraziť známe číslo, no volajúci chce heslo, SMS kód, údaje karty alebo okamžitú spoluprácu.',
        signals: 'Známe číslo · silná emócia · citlivé údaje',
        action: 'Nespoliehajte sa na zobrazené číslo. Hovor ukončite a kontakt vyhľadajte samostatne.',
      },
    ],
  },
  {
    id: 'platba',
    label: 'Platby a práca',
    title: 'Cieľom je dostať vás k prevodu alebo karte.',
    intro: 'Podvod môže nadviazať na skutočnú faktúru, pracovnú ponuku alebo predaj na bazári. Rozhodujúca je zmena zaužívaného procesu.',
    items: [
      {
        icon: BadgeEuro,
        title: 'Faktúra so zmeneným IBAN-om',
        description: 'Útočník napodobní dodávateľa alebo sa dostane do reálnej komunikácie a tesne pred úhradou oznámi nové číslo účtu.',
        signals: 'Nový IBAN · podobná doména · platba pred termínom',
        action: 'Zmenu účtu overte telefonicky u známeho kontaktu, nie odpoveďou na podozrivý e-mail.',
      },
      {
        icon: ShoppingBag,
        title: 'Bazár a falošný kupujúci',
        description: 'Kupujúci pošle externý odkaz na „prijatie peňazí“ alebo kuriéra. Formulár následne pýta údaje karty či bankové prihlásenie.',
        signals: 'Odkaz mimo platformy · formulár na kartu · kuriér',
        action: 'Komunikujte a prijímajte platbu iba cez funkcie pôvodnej platformy.',
      },
      {
        icon: Briefcase,
        title: 'Falošná práca a money mule',
        description: 'Ponuka sľubuje jednoduchú prácu z domu. Vašou úlohou má byť prijímať peniaze a preposielať ich ďalej za províziu.',
        signals: 'Rýchly zárobok · vlastný účet · preposielanie peňazí',
        action: 'Nepoužívajte svoj účet na cudzie prevody. Môže ísť o pranie výnosov z trestnej činnosti.',
      },
      {
        icon: Package,
        title: 'Kuriér, zásielka alebo clo',
        description: 'SMS či e-mail tvrdí, že zásielku treba doplatiť alebo opraviť adresu. Malý poplatok je zámienka na získanie údajov karty.',
        signals: 'Drobný doplatok · skrátený odkaz · časový limit',
        action: 'Stav zásielky otvorte priamo v aplikácii alebo na ručne napísanej adrese dopravcu.',
      },
    ],
  },
  {
    id: 'zisk',
    label: 'Zisk a vzťahy',
    title: 'Práca s nádejou a strachom, že prídete o príležitosť.',
    intro: 'Podvodník si môže dôveru budovať celé týždne. Prvé platby bývajú malé a platforma môže ukazovať zisky, ktoré neexistujú.',
    items: [
      {
        icon: TrendingUp,
        title: 'Investície a kryptomeny',
        description: 'Reklama zneužije známu osobnosť alebo médium. Po registrácii nasledujú telefonáty, vzdialený prístup a tlak na ďalšie vklady.',
        signals: 'Garantovaný výnos · známa tvár · problém s výberom',
        action: 'Overte poskytovateľa v registroch NBS a neposielajte peniaze počas telefonátu.',
      },
      {
        icon: HeartHandshake,
        title: 'Romantický alebo priateľský podvod',
        description: 'Nový známy rýchlo vytvára intenzívny vzťah. Neskôr potrebuje peniaze na cestu, liečbu, balík alebo spoločnú investíciu.',
        signals: 'Rýchla intimita · nemožné stretnutie · opakované krízy',
        action: 'Pred platbou príbeh preverte s niekým nezávislým a vyhľadajte fotografie osoby.',
      },
      {
        icon: RefreshCcw,
        title: '„Vrátime vám ukradnuté peniaze“',
        description: 'Po prvom podvode sa ozve údajný právnik, vyšetrovateľ alebo firma na vymáhanie. Za vrátenie peňazí žiada poplatok vopred.',
        signals: 'Pozná vašu stratu · sľub návratnosti · poplatok vopred',
        action: 'Neplaťte ďalší poplatok. Komunikujte priamo s bankou a políciou.',
      },
      {
        icon: Gift,
        title: 'Výhra, dotácia alebo darček',
        description: 'Správa oznamuje cenu či podporu, o ktorú ste nežiadali. Na vyplatenie chce poplatok, údaje karty alebo osobné doklady.',
        signals: 'Nečakaná výhra · poplatok za prevzatie · zdieľanie údajov',
        action: 'Overte súťaž na oficiálnom profile organizátora a nič neplaťte za „uvoľnenie“ výhry.',
      },
    ],
  },
  {
    id: 'pristup',
    label: 'Odkazy a prístup',
    title: 'Cieľom je, aby ste otvorili dvere do účtu vy sami.',
    intro: 'Falošná stránka môže vyzerať takmer identicky ako originál. Nebezpečný nemusí byť iba odkaz v správe — môže ním byť aj kód.',
    items: [
      {
        icon: Link2,
        title: 'Phishing a smishing',
        description: 'E-mail alebo SMS smeruje na napodobeninu banky, pošty, sociálnej siete či štátnej služby a pýta prihlásenie alebo údaje karty.',
        signals: 'Prihlásenie cez odkaz · podobná doména · naliehavosť',
        action: 'Stránku zatvorte a službu otvorte cez vlastnú záložku alebo ručne napísanú adresu.',
      },
      {
        icon: QrCode,
        title: 'QR phishing',
        description: 'QR kód na parkovacom automate, faktúre alebo v e-maile prekryje cieľovú adresu a otvorí falošnú platobnú či prihlasovaciu stránku.',
        signals: 'Prelepený kód · neviditeľná adresa · okamžitá platba',
        action: 'Pred pokračovaním skontrolujte doménu a pri platbe použite oficiálnu aplikáciu.',
      },
      {
        icon: MonitorSmartphone,
        title: 'Falošná technická podpora',
        description: 'Telefonát alebo okno v prehliadači hlási vírus či problém s účtom. „Technik“ vás navedie na inštaláciu vzdialeného prístupu.',
        signals: 'Nečakaná podpora · inštalácia aplikácie · zdieľaná obrazovka',
        action: 'Nič neinštalujte. Zariadenie odpojte od siete a kontaktujte vlastnú IT podporu.',
      },
      {
        icon: KeyRound,
        title: 'Prevzatie účtu a SIM swap',
        description: 'Podvodník sa snaží získať obnovovací kód, potvrdenie prihlásenia alebo novú SIM, aby obišiel ochranu e-mailu či banky.',
        signals: 'Nečakaný kód · výpadok SIM · upozornenie na prihlásenie',
        action: 'Kód nikomu neposielajte, zmeňte heslo z dôveryhodného zariadenia a kontaktujte operátora.',
      },
    ],
  },
]

export default function ScamTypesPage() {
  return (
    <div className="bg-white text-[#020617] font-sans selection:bg-[#020617] selection:text-white">
      
      {/* 1. HERO SECTION */}
      <section className="pt-32 pb-24 lg:pt-48 lg:pb-32 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-[#2563EB] font-bold text-sm uppercase tracking-widest mb-6">Typy podvodov</p>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-[#020617] leading-[1.05] mb-8">
            Mení sa príbeh. <br className="hidden md:block"/>
            <span className="text-slate-400">Nie spôsob, akým vás tlačia konať.</span>
          </h1>
          <p className="text-xl lg:text-2xl text-slate-500 leading-relaxed mb-12 max-w-3xl mx-auto font-medium">
            Podvod nemusí mať preklepy. Môže poznať vaše meno a nadviazať na skutočnú komunikáciu. Preto sledujte najmä to, aká je požiadavka.
          </p>
          <div className="flex justify-center">
            <Link 
              href="/vyskusat" 
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#020617] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#1A2B44]"
            >
              Preveriť podozrenie <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. NAVIGATION JUMP LINKS */}
      <section className="border-y border-slate-100 py-6 px-6 sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <div className="container mx-auto max-w-6xl">
          <nav aria-label="Kategórie podvodov" className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {SCAM_GROUPS.map((group, index) => (
              <a 
                key={group.id} 
                href={`#${group.id}`} 
                className="group flex items-center text-[15px] font-semibold text-slate-600 transition-colors hover:text-[#020617]"
              >
                <span className="text-slate-300 mr-2">0{index + 1}</span>
                {group.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* 3. FOUR RULES (Minimalist List) */}
      <section className="py-24 px-6 bg-[#F7F8FA]">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-[1fr_1.5fr] gap-16 lg:gap-24 items-start">
          <div className="lg:sticky lg:top-32">
            <AlertCircle className="h-10 w-10 text-[#2563EB] mb-6" strokeWidth={1.5} />
            <h2 className="text-4xl font-extrabold tracking-tight text-[#020617] leading-[1.1]">
              Štyri otázky, ktoré odhalia spoločný vzorec
            </h2>
          </div>
          
          <div className="flex flex-col gap-10">
            {[
              ['Kto odo mňa niečo chce?', 'Overte identitu mimo správy alebo hovoru, ktorý vás zaskočil.'],
              ['Prečo práve teraz?', 'Časový tlak často bráni tomu, aby ste si príbeh overili.'],
              ['Čo mám odovzdať?', 'Peniaze, heslo, kód, doklad aj vzdialený prístup majú skutočnú hodnotu.'],
              ['Môžem to potvrdiť inde?', 'Oficiálny web, pôvodné číslo a druhý človek prerušia podvodníkov scenár.'],
            ].map(([question, answer], index) => (
              <div key={question} className="flex gap-6 items-start">
                <span className="text-sm font-bold text-slate-300 mt-1">0{index + 1}</span>
                <div>
                  <h3 className="text-2xl font-bold text-[#020617] mb-2">{question}</h3>
                  <p className="text-[17px] leading-relaxed text-slate-500">{answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SCAM GROUPS (Editorial Layout) */}
      {SCAM_GROUPS.map((group, groupIndex) => (
        <section key={group.id} id={group.id} className="py-24 lg:py-32 px-6 border-b border-slate-100 last:border-0 scroll-mt-24">
          <div className="container mx-auto max-w-6xl grid lg:grid-cols-[1fr_2fr] gap-16 lg:gap-24 items-start">
            
            {/* Sticky Sidebar Category Title */}
            <div className="lg:sticky lg:top-32">
              <p className="text-sm font-bold text-slate-400 mb-4">0{groupIndex + 1} · {group.label}</p>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#020617] leading-[1.1] mb-6">
                {group.title}
              </h2>
              <p className="text-[17px] leading-relaxed text-slate-500">
                {group.intro}
              </p>
            </div>

            {/* List of Scams */}
            <div className="flex flex-col divide-y divide-slate-100">
              {group.items.map(({ icon: Icon, title, description, signals, action }) => (
                <article key={title} className="py-10 first:pt-0 last:pb-0">
                  <div className="flex gap-6 items-start">
                    <div className="shrink-0 mt-1">
                      <Icon className="h-7 w-7 text-[#020617]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-[#020617] mb-3">{title}</h3>
                      <p className="text-[17px] leading-relaxed text-slate-600 mb-6">
                        {description}
                      </p>
                      
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono font-bold tracking-tight rounded-md">
                          SIGNÁLY: {signals}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3 mt-4 text-[15px] font-medium text-emerald-700 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
                        <p>{action}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

          </div>
        </section>
      ))}

      {/* 5. POST-INCIDENT SECTION (Stark contrast) */}
      <section className="bg-[#020617] text-white py-32 px-6">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-[1fr_1.5fr] gap-16 lg:gap-24 items-start">
          <div className="lg:sticky lg:top-32">
            <Smartphone className="h-10 w-10 text-[#2563EB] mb-6" strokeWidth={1.5} />
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Ak ste už klikli, zaplatili alebo odovzdali údaje
            </h2>
            <p className="text-[17px] leading-relaxed text-slate-400">
              Nečakajte na ďalšiu správu od útočníka. Rýchla reakcia môže významne obmedziť škodu.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-12">
            {[
              ['Kontaktujte banku', 'Požiadajte o preverenie alebo zastavenie platby a zablokovanie karty.'],
              ['Zmeňte prístupy', 'Začnite e-mailom a heslá meňte z čistého, dôveryhodného zariadenia.'],
              ['Odpojte zariadenie', 'Ak ste nainštalovali vzdialený prístup, odpojte internet a vyhľadajte IT pomoc.'],
              ['Uložte dôkazy', 'Zachovajte správy, čísla, adresy, potvrdenia a udalosť oznámte polícii.'],
            ].map(([title, text], index) => (
              <article key={title} className="flex flex-col">
                <span className="text-sm font-bold text-slate-600 mb-4">0{index + 1}</span>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-[16px] leading-relaxed text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-32 px-6 bg-[#F7F8FA]">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#020617] mb-8">
            Nemusíte poznať názov podvodu. Stačí ho preveriť
          </h2>
          <p className="text-[17px] text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Obsah vychádza z verejných odporúčaní Národnej banky Slovenska a Europolu. Ak si nie ste istý obsahom správy, nechajte si ju skontrolovať.
          </p>
          <Link 
            href="/vyskusat" 
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#020617] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#1A2B44]"
          >
            Analyzovať podozrenie <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

    </div>
  )
}
