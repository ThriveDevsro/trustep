'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  RefreshCw,
} from 'lucide-react'
import { getAppAuthHeaders, getCurrentAppUser } from '@/lib/app-auth'

type Signal = { id: string; label: string; correct: boolean; explanation: string }
type Decision = { label: string; correct: boolean; outcome: string }
type Scenario = { channel: 'mail' | 'chat' | 'sms' | 'web'; category: string; sender: string; address: string; subject: string; time: string; context: string; body: string[]; signals: Signal[]; decisions: Decision[] }

const SCENARIOS: Scenario[] = [
  {
    channel: 'chat', category: 'Interná urgentná požiadavka', sender: 'Peter Novák', address: 'Generálny riaditeľ', subject: 'Nová správa v Teams', time: '11:42', context: 'Ste vo firemnom Teams. Peter je na pracovnej ceste a bežne vám píše.',
    body: ['Ahoj, som práve v rokovaní a nemôžem volať.', 'Prosím, kúp 6 darčekových kariet v hodnote 200 € a pošli mi kódy sem. Je to pre partnerov, potrebujem to vybaviť do 30 minút.', 'Nikomu to zatiaľ neposúvaj, preberieme to potom.'],
    signals: [
      { id: 'pressure', label: 'Časový tlak', correct: true, explanation: 'Útočník chce, aby ste konali skôr, než si stihnete vec overiť.' },
      { id: 'secrecy', label: 'Žiadosť o tajnosť', correct: true, explanation: 'Tajnosť má zabrániť overeniu s kolegom alebo nadriadeným.' },
      { id: 'payment', label: 'Nezvyčajný spôsob platby', correct: true, explanation: 'Darčekové karty a kódy sú pri CEO fraud veľmi častý cieľ.' },
      { id: 'known', label: 'Poznáte meno odosielateľa', correct: false, explanation: 'Známe meno nie je dôkaz. Účet môže byť napadnutý alebo napodobnený.' },
      { id: 'travel', label: 'Odosielateľ je na ceste', correct: false, explanation: 'Cesta sama o sebe nie je podvodný znak, ale môže byť použitá ako zámienka.' },
    ],
    decisions: [
      { label: 'Zavolám Petrovi na číslo uložené v kontaktoch alebo požiadam o videooverenie.', correct: true, outcome: 'Správny postup. Použili ste nezávislý kanál a neprijali ste podmienku „nevolať“.' },
      { label: 'Odpoviem v tomto chate, nech mi Peter potvrdí, že je to naozaj on.', correct: false, outcome: 'Ak je účet napadnutý, potvrdenie stále posiela útočník. Treba zmeniť kanál.' },
      { label: 'Kúpim jednu kartu, aby som nestratil čas, a zvyšok overím potom.', correct: false, outcome: 'Aj malý prvý krok dá útočníkovi to, čo potrebuje. Overenie patrí pred platbu.' },
    ],
  },
  {
    channel: 'mail', category: 'Zmena údajov dodávateľa', sender: 'Ivana Horváthová', address: 'fakturacia@novatek-partners.com', subject: 'RE: Faktúra 2026-081 – aktualizácia účtu', time: '09:17', context: 'E-mail nadväzuje na skutočnú faktúru od dodávateľa, ktorého používate už dva roky.',
    body: ['Dobrý deň, v nadväznosti na faktúru posielam nové platobné údaje. Pôvodný účet už nepoužívame.', 'Prosím, použite IBAN SK72 1100 0000 0029 8765 4321. Splatnosť zostáva dnes.', 'Ďakujem, Ivana'],
    signals: [
      { id: 'domain', label: 'Doména sa jemne líši od známej firmy', correct: true, explanation: 'Pôvodný dodávateľ používu novatek.sk, tu je novatek-partners.com. Malá zmena je typická pre impersonáciu.' },
      { id: 'iban', label: 'Mení sa IBAN tesne pred splatnosťou', correct: true, explanation: 'Zmena platobných údajov vyžaduje samostatné overenie, aj keď e-mail vyzerá dôveryhodne.' },
      { id: 'thread', label: 'E-mail je v existujúcom vlákne', correct: false, explanation: 'Vlákno možno napodobniť alebo doň vložiť z kompromitovaného účtu. Nie je to dôkaz pravosti.' },
      { id: 'signature', label: 'Podpis obsahuje meno kontaktnej osoby', correct: false, explanation: 'Meno a podpis sa dajú jednoducho skopírovať.' },
      { id: 'deadline', label: 'Splatnosť je dnes', correct: true, explanation: 'Časový tlak znižuje šancu, že si zmenu overíte mimo e-mailu.' },
    ],
    decisions: [
      { label: 'Zavolám na číslo dodávateľa z nášho CRM a zmenu IBANu potvrdím.', correct: true, outcome: 'Správne. Kontrolujete citlivú zmenu mimo správy, ktorá ju žiada.' },
      { label: 'Odpoviem do vlákna a požiadam o potvrdenie.', correct: false, outcome: 'Pri kompromitovanom účte odpoveď stále číta útočník.' },
      { label: 'Zaplatím pôvodný IBAN, aby sa faktúra neomeškala.', correct: false, outcome: 'Môže to byť bezpečnejšie než nový účet, ale platobné údaje treba najprv vyriešiť s dodávateľom.' },
    ],
  },
  {
    channel: 'mail', category: 'Prihlasovací phishing', sender: 'Microsoft account', address: 'no-reply@security-microsoft-login.co', subject: 'Neobvyklé prihlásenie k vášmu účtu', time: '07:31', context: 'Správa prišla pred pracovným časom a používa logo služby, ktorú vo firme naozaj používate.',
    body: ['Zaznamenali sme prihlásenie z nového zariadenia v Košiciach.', 'Ak ste to neboli vy, zabezpečte účet do 10 minút.', 'Tlačidlo: Skontrolovať aktivitu'],
    signals: [
      { id: 'domain', label: 'Doména odosielateľa nie je microsoft.com', correct: true, explanation: 'Logo a zobrazované meno nemajú rovnakú váhu ako skutočná doména odosielateľa.' },
      { id: 'timer', label: 'Hrozba s krátkym časovým limitom', correct: true, explanation: 'Bezpečnostné incidenty sa riešia, no seriózne služby vás netlačia do kliknutia cez neznámy odkaz.' },
      { id: 'location', label: 'Správa spomína konkrétne mesto', correct: false, explanation: 'Presvedčivý detail môže byť pravdivý aj vymyslený; sám osebe nič nepotvrdzuje.' },
      { id: 'button', label: 'Výzva na prihlásenie cez tlačidlo', correct: true, explanation: 'Prihlásenie cez odkaz z e-mailu je rizikové. Službu otvorte sami.' },
      { id: 'early', label: 'E-mail prišiel skoro ráno', correct: false, explanation: 'Čas doručenia nie je spoľahlivý indikátor.' },
    ],
    decisions: [
      { label: 'Otvorím Microsoft 365 cez vlastnú záložku a preverím aktivitu účtu tam.', correct: true, outcome: 'Správne. Reagujete na potenciálny problém, ale nepoužívate útočníkov odkaz.' },
      { label: 'Kliknem na tlačidlo, ale heslo zadám iba ak stránka vyzerá normálne.', correct: false, outcome: 'Phishingová stránka môže vyzerať identicky. Rozhodujúca je doména a spôsob, akým ste sa tam dostali.' },
      { label: 'Správu ignorujem, lebo môže byť falošná.', correct: false, outcome: 'Môže ísť aj o reálny incident. Bezpečné je overiť ho cez oficiálnu aplikáciu.' },
    ],
  },
  {
    channel: 'sms', category: 'Doručenie zásielky', sender: 'Doručenie', address: '+421 902 481 773', subject: 'SMS správa', time: '13:08', context: 'Čakáte balík a SMS prišla v deň, keď má byť doručený.',
    body: ['Balík č. SK-884291 nebol doručený pre neúplnú adresu. Doplňte údaje a uhraďte poplatok 0,79 € do 15 minút: post-slovensko-dorucenie.com/track'],
    signals: [
      { id: 'brand-domain', label: 'Odkaz nepoužíva oficiálnu doménu dopravcu', correct: true, explanation: 'Názov značky vložený do dlhej domény nie je dôkaz, že stránka patrí dopravcovi.' },
      { id: 'small-fee', label: 'Žiada malý poplatok', correct: true, explanation: 'Malá suma má znížiť ostražitosť a dostať údaje z platobnej karty.' },
      { id: 'expected', label: 'Práve čakáte zásielku', correct: false, explanation: 'To vysvetľuje, prečo správa pôsobí presvedčivo, nie prečo je dôveryhodná.' },
      { id: 'urgency', label: 'Používa 15-minútový limit', correct: true, explanation: 'Naliehavosť je nástroj na potlačenie overovania.' },
      { id: 'tracking', label: 'Obsahuje číslo zásielky', correct: false, explanation: 'Číslo môže byť vymyslené alebo všeobecné. Overte ho v oficiálnej aplikácii.' },
    ],
    decisions: [
      { label: 'Otvorím oficiálnu aplikáciu alebo web dopravcu a číslo zásielky overím tam.', correct: true, outcome: 'Správne. Kontext zásielky preverujete bez dôvery v odkaz zo SMS.' },
      { label: 'Zaplatím 0,79 €, lebo táto suma mi nevadí.', correct: false, outcome: 'Podvodníkovi nejde o poplatok, ale o údaje karty a možnosť ďalších platieb.' },
      { label: 'Odpoviem STOP, aby mi už nechodili správy.', correct: false, outcome: 'Odpoveď môže potvrdiť aktívne číslo. Lepšie je správu zmazať a označiť ako spam.' },
    ],
  },
  {
    channel: 'web', category: 'Falošná prihlasovacia stránka', sender: 'Internet banking', address: 'https://mojabanka-bezpecnost.com/prihlasenie', subject: 'Overenie účtu', time: 'teraz', context: 'Po kliknutí na reklamu sa otvorila stránka, ktorá vyzerá ako vaša banka.',
    body: ['Bezpečnostné overenie', 'Pre pokračovanie sa prihláste do internet bankingu.', 'Prihlásiť sa bezpečne'],
    signals: [
      { id: 'lookalike', label: 'Adresa obsahuje meno banky, no nie jej oficiálnu doménu', correct: true, explanation: 'Podvodné weby často používajú dôveryhodne znejúce kombinácie slov a pomlčiek.' },
      { id: 'ad', label: 'Stránka sa otvorila z reklamy', correct: true, explanation: 'Reklama nie je dôkaz dôveryhodnosti; môže viesť na napodobeninu.' },
      { id: 'logo', label: 'Stránka má logo banky', correct: false, explanation: 'Logo sa dá skopírovať. Rozhodujúca je doména a spôsob overenia.' },
      { id: 'login', label: 'Hneď žiada prihlásenie', correct: true, explanation: 'Ak ste službu neotvorili sami, neprihlasujte sa cez jej prvú výzvu.' },
      { id: 'lock', label: 'Prehliadač zobrazuje zámok HTTPS', correct: false, explanation: 'HTTPS chráni spojenie so stránkou, nie to, komu stránka patrí.' },
    ],
    decisions: [
      { label: 'Zavriem stránku a banku otvorím cez vlastnú uloženú adresu alebo aplikáciu.', correct: true, outcome: 'Správne. Rozbíjate scenár útočníka a vraciate kontrolu k známemu kanálu.' },
      { label: 'Overím si logo a zámok v prehliadači, potom sa prihlásim.', correct: false, outcome: 'Vizuálne prvky sa dajú napodobniť. HTTPS neoveruje pravosť značky.' },
      { label: 'Skúsim zadať iba používateľské meno bez hesla.', correct: false, outcome: 'Aj používateľské meno je cenný údaj na ďalší útok. Nič nezadávajte.' },
    ],
  },
]

export default function ResilienceTestPage() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'signals' | 'decision'>('signals')
  const [selectedSignals, setSelectedSignals] = useState<string[]>([])
  const [signalsRevealed, setSignalsRevealed] = useState(false)
  const [selectedDecision, setSelectedDecision] = useState<number | null>(null)
  const [signalScores, setSignalScores] = useState<number[]>([])
  const [decisionScores, setDecisionScores] = useState<boolean[]>([])
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<'daily' | 'full'>('full')
  const [finished, setFinished] = useState(false)
  const [dailyDone, setDailyDone] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [scoreSaved, setScoreSaved] = useState(false)
  
  const dailyIndex = Math.floor(Date.now() / 86_400_000) % SCENARIOS.length
  const dailyKey = `truststep_daily_training_${new Date().toISOString().slice(0, 10)}`
  const scenario = SCENARIOS[index]
  const completed = finished

  const signalResult = useMemo(() => {
    const correct = scenario?.signals.filter((signal) => signal.correct) ?? []
    return { caught: correct.filter((signal) => selectedSignals.includes(signal.id)).length, total: correct.length }
  }, [scenario, selectedSignals])

  function toggleSignal(id: string) { if (!signalsRevealed) setSelectedSignals((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]) }
  function revealSignals() { if (selectedSignals.length) { setSignalsRevealed(true); setSignalScores((scores) => [...scores, signalResult.caught]) } }
  function chooseDecision(choice: number) { if (selectedDecision === null) { setSelectedDecision(choice); setDecisionScores((scores) => [...scores, scenario.decisions[choice].correct]) } }
  
  useEffect(() => { setDailyDone(window.localStorage.getItem(dailyKey) === 'done') }, [dailyKey])
  useEffect(() => { void (async () => { setIsLoggedIn(Boolean(await getCurrentAppUser())); setAuthChecked(true) })() }, [])

  function start(nextMode: 'daily' | 'full') { 
    setMode(nextMode); 
    setIndex(nextMode === 'daily' ? dailyIndex : 0); 
    setPhase('signals'); 
    setSelectedSignals([]); 
    setSignalsRevealed(false); 
    setSelectedDecision(null); 
    setSignalScores([]); 
    setDecisionScores([]); 
    setFinished(false); 
    setScoreSaved(false); 
    setStarted(true) 
  }

  async function saveScore() {
    if (!isLoggedIn) return
    const completedScenarios = mode === 'daily' ? [SCENARIOS[dailyIndex]] : SCENARIOS
    const caught = signalScores.reduce((total, value) => total + value, 0)
    const signalTotal = completedScenarios.reduce((total, item) => total + item.signals.filter((signal) => signal.correct).length, 0)
    const safeActions = decisionScores.filter(Boolean).length
    const totalPoints = signalTotal + completedScenarios.length
    const score = totalPoints ? Math.round(((caught + safeActions) / totalPoints) * 100) : 0
    try {
      const response = await fetch('/api/training-results', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', ...await getAppAuthHeaders() }, 
        body: JSON.stringify({ mode, score, caughtSignals: caught, totalSignals: signalTotal, safeActions, totalScenarios: completedScenarios.length }) 
      })
      if (response.ok) setScoreSaved(true)
    } catch { /* Suppress temporary errors */ }
  }

  function nextScenario() {
    if (mode === 'daily' || index + 1 === SCENARIOS.length) {
      if (mode === 'daily') { window.localStorage.setItem(dailyKey, 'done'); setDailyDone(true) }
      void saveScore()
      setFinished(true)
      return
    }
    setIndex((value) => value + 1); 
    setPhase('signals'); 
    setSelectedSignals([]); 
    setSignalsRevealed(false); 
    setSelectedDecision(null)
  }

  function restart() { 
    setIndex(mode === 'daily' ? dailyIndex : 0); 
    setPhase('signals'); 
    setSelectedSignals([]); 
    setSignalsRevealed(false); 
    setSelectedDecision(null); 
    setSignalScores([]); 
    setDecisionScores([]); 
    setFinished(false) 
  }

  function exitTraining() { 
    setStarted(false); 
    setFinished(false); 
    setIndex(0); 
    setPhase('signals'); 
    setSelectedSignals([]); 
    setSignalsRevealed(false); 
    setSelectedDecision(null); 
    setSignalScores([]); 
    setDecisionScores([]) 
  }

  if (!authChecked) return <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#f8faf9]"><RefreshCw className="h-6 w-6 animate-spin text-[#2563EB]" /></div>

  /* ---------------- INTRO VIEW (Clean & Editorial) ---------------- */
  if (!started) {
    return (
      <div className="min-h-screen bg-[#f8faf9] px-6 py-16 text-[#020617] lg:py-24">
        <div className="mx-auto max-w-3xl">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#2563EB]">
            Tréning odolnosti
          </span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#020617] sm:text-6xl">
            Rozhodovanie v praxi<br />Bez teórie
          </h1>
          <p className="mt-6 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
            Každá situácia vychádza z reálnych útokov. Vaším cieľom je najprv identifikovať podozrivé signály v správe a následne vybrať najbezpečnejší postup.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 border-y border-slate-200/80 py-8">
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#020617]">05</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Modelových situácií</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#020617]">02</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Kroky na incident</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-600">100%</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Bez časového stresu</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => start('daily')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#020617] px-8 py-4 text-xs font-extrabold text-white transition hover:bg-[#071d3d] shadow-sm"
            >
              <span>{dailyDone ? 'Dnešná situácia splnená' : 'Dnešná situácia (60s)'}</span>
              <ArrowRight className="h-4 w-4 text-[#2563EB]" />
            </button>
            <button
              type="button"
              onClick={() => start('full')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-4 text-xs font-extrabold text-[#020617] transition hover:border-[#020617]"
            >
              Kompletný tréning (5 situácií)
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- COMPLETED VIEW ---------------- */
  if (completed) {
    const completedScenarios = mode === 'daily' ? [SCENARIOS[dailyIndex]] : SCENARIOS
    const signalTotal = completedScenarios.reduce((total, item) => total + item.signals.filter((signal) => signal.correct).length, 0)
    const caught = signalScores.reduce((total, score) => total + score, 0)
    const safeActions = decisionScores.filter(Boolean).length
    const weakestScenario = completedScenarios[signalScores.reduce((weakest, score, current) => score < signalScores[weakest] ? current : weakest, 0)]
    const profile = safeActions < completedScenarios.length
      ? 'Pri ďalšej situácii si dajte jeden krok navyše: nehľadajte len chybu, ale vyberte nezávislý spôsob overenia.'
      : `Váš ďalší tréningový fokus: ${weakestScenario.category.toLowerCase()}. Aj pri správnom rozhodnutí sa oplatí zachytávať viac súvisiacich signálov.`

    return (
      <div className="min-h-screen bg-[#f8faf9] px-6 py-12 text-[#020617] sm:py-20">
        <div className="mx-auto max-w-3xl">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">
            {mode === 'daily' ? 'Denný tréning splnený' : 'Tréning dokončený'}
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl text-[#020617]">
            Správny návyk: Zastaviť sa a overiť
          </h1>
          <p className="mt-4 text-base font-medium text-slate-600">
            Vyhodnotenie vašich reakcií v simuláciách.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="border-l-2 border-[#020617] pl-4 py-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Zachytené rizikové signály</p>
              <p className="mt-1 font-mono text-3xl font-extrabold text-[#020617]">{caught} / {signalTotal}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">Signály je dobré spájať. Jeden detail často nestačí.</p>
            </div>
            <div className="border-l-2 border-emerald-500 pl-4 py-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Bezpečný ďalší krok</p>
              <p className="mt-1 font-mono text-3xl font-extrabold text-emerald-600">{safeActions} / {completedScenarios.length}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">Neodpovedať cez podozrivý kanál je kľúčová obrana.</p>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200/80 pt-6">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Odporúčanie pre vás</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">{profile}</p>
            {isLoggedIn ? (
              <p className="mt-3 font-mono text-[11px] text-slate-400">{scoreSaved ? '✓ Výsledok uložený k účtu' : 'Ukladám výsledky...'}</p>
            ) : (
              <Link href="/register?next=%2Ftest-odolnosti" className="mt-3 inline-flex text-xs font-extrabold text-[#2563EB] hover:underline">Vytvoriť účet a ukladať skóre</Link>
            )}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={isLoggedIn ? '/submit' : '/vyskusat'}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#e84600]"
            >
              Overiť reálnu správu <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-xs font-bold text-[#020617] transition hover:border-[#020617]"
            >
              <RefreshCw className="h-4 w-4" /> Trénovať znova
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- ACTIVE SIMULATION VIEW ---------------- */
  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#020617]">
      <div className="mx-auto max-w-6xl px-6 py-6 sm:py-8">
        
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#2563EB]">Simulácia</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-slate-500">{scenario.category}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-extrabold text-[#020617]">
              {mode === 'daily' ? 'Dnes 1 / 1' : `${index + 1} / ${SCENARIOS.length}`}
            </span>
            <button
              type="button"
              onClick={exitTraining}
              className="text-xs font-bold text-slate-400 hover:text-[#020617] transition"
            >
              Ukončiť
            </button>
          </div>
        </header>

        {/* Main Content Layout */}
        <main className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          
          {/* Left Column: Context & Message Preview */}
          <div>
            <div className="mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Kontext situácie</span>
              <p className="mt-1 text-sm font-semibold text-slate-800 leading-relaxed">{scenario.context}</p>
            </div>

            <div className="mt-6">
              <ScenarioPreview scenario={scenario} />
            </div>
          </div>

          {/* Right Column: Interaction Panel */}
          <div className="lg:border-l lg:border-slate-200/80 lg:pl-8">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#2563EB]">
                {phase === 'signals' ? 'Krok 1: Analýza stôp' : 'Krok 2: Rozhodnutie'}
              </span>
              <span className="font-mono text-xs font-bold text-slate-400">
                {phase === 'signals' ? '01 / 02' : '02 / 02'}
              </span>
            </div>

            {phase === 'signals' ? (
              <SignalStep
                scenario={scenario}
                selected={selectedSignals}
                revealed={signalsRevealed}
                result={signalResult}
                onToggle={toggleSignal}
                onReveal={revealSignals}
                onDecision={() => setPhase('decision')}
              />
            ) : (
              <DecisionStep
                scenario={scenario}
                selected={selectedDecision}
                onSelect={chooseDecision}
                onNext={nextScenario}
                last={mode === 'daily' || index + 1 === SCENARIOS.length}
              />
            )}
          </div>

        </main>
      </div>
    </div>
  )
}

/* ---------------- SUB-COMPONENTS ---------------- */

function SignalStep({
  scenario,
  selected,
  revealed,
  result,
  onToggle,
  onReveal,
  onDecision,
}: {
  scenario: Scenario
  selected: string[]
  revealed: boolean
  result: { caught: number; total: number }
  onToggle: (id: string) => void
  onReveal: () => void
  onDecision: () => void
}) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-[#020617]">Označte podozrivé signály v správe</h2>
      <p className="mt-1 text-xs font-medium text-slate-500">
        Kliknite na prvky, ktoré by vás prinútili spozornieť.
      </p>

      <div className="mt-6 space-y-2">
        {scenario.signals.map((signal) => {
          const chosen = selected.includes(signal.id)
          
          let stateStyle = 'border-slate-200 bg-white hover:border-[#020617]'
          if (revealed) {
            if (signal.correct) stateStyle = 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
            else if (chosen) stateStyle = 'border-red-300 bg-red-50/50 text-red-900'
            else stateStyle = 'border-slate-200 opacity-60'
          } else if (chosen) {
            stateStyle = 'border-[#020617] bg-slate-50 text-[#020617] font-bold'
          }

          return (
            <button
              key={signal.id}
              type="button"
              onClick={() => onToggle(signal.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition ${stateStyle}`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                chosen ? 'border-[#020617] bg-[#020617] text-white' : 'border-slate-300'
              }`}>
                {chosen && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="leading-relaxed">{signal.label}</span>
            </button>
          )
        })}
      </div>

      {revealed ? (
        <div className="mt-6 border-t border-slate-200/80 pt-5">
          <p className="font-mono text-xs font-extrabold text-emerald-700">
            ✓ Zachytené {result.caught} z {result.total} hlavných signálov
          </p>
          <div className="mt-3 space-y-2 text-xs font-medium text-slate-600">
            {scenario.signals.filter((s) => s.correct).map((s) => (
              <p key={s.id}>• {s.explanation}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={onDecision}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#020617] py-3 text-xs font-extrabold text-white transition hover:bg-[#071d3d]"
          >
            <span>Pokračovať na vybrať kroku</span>
            <ChevronRight className="h-4 w-4 text-[#2563EB]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!selected.length}
          onClick={onReveal}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#020617] py-3.5 text-xs font-extrabold text-white transition hover:bg-[#071d3d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>Vyhodnotiť označené signály</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function DecisionStep({
  scenario,
  selected,
  onSelect,
  onNext,
  last,
}: {
  scenario: Scenario
  selected: number | null
  onSelect: (index: number) => void
  onNext: () => void
  last: boolean
}) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-[#020617]">Aké rozhodnutie urobíte?</h2>
      <p className="mt-1 text-xs font-medium text-slate-500">
        Vyberte najbezpečnejšiu reakciu v tejto situácii.
      </p>

      <div className="mt-6 space-y-3">
        {scenario.decisions.map((decision, index) => {
          const chosen = selected === index
          let stateStyle = 'border-slate-200 bg-white hover:border-[#020617]'
          
          if (selected !== null) {
            if (decision.correct) stateStyle = 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
            else if (chosen) stateStyle = 'border-red-300 bg-red-50/50 text-red-900'
            else stateStyle = 'border-slate-200 opacity-50'
          }

          return (
            <button
              key={decision.label}
              type="button"
              onClick={() => onSelect(index)}
              className={`w-full rounded-xl border p-4 text-left text-xs font-semibold leading-relaxed transition ${stateStyle}`}
            >
              {decision.label}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div className="mt-6 border-t border-slate-200/80 pt-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#020617]">Dôsledok rozhodnutia</p>
          <p className="mt-2 text-xs font-medium leading-relaxed text-slate-700">
            {scenario.decisions[selected].outcome}
          </p>
          <button
            type="button"
            onClick={onNext}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3.5 text-xs font-extrabold text-white transition hover:bg-[#e84600]"
          >
            <span>{last ? 'Zobraziť výsledok' : 'Ďalšia situácia'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function ScenarioPreview({ scenario }: { scenario: Scenario }) {
  if (scenario.channel === 'sms') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-md mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-[#020617]">{scenario.sender}</span>
            <span className="font-mono text-[11px] text-slate-400">{scenario.address}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{scenario.time}</span>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 border border-slate-100">
          {scenario.body[0]}
        </div>
      </div>
    )
  }

  if (scenario.channel === 'web') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-500">
          <Globe className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate font-semibold text-slate-800">{scenario.address}</span>
        </div>
        <div className="p-6">
          <div className="max-w-xs mx-auto space-y-4 text-center">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{scenario.body[0]}</p>
            <p className="text-sm font-semibold text-[#020617]">{scenario.body[1]}</p>
            <div className="pt-2">
              <button type="button" className="w-full rounded-xl bg-[#020617] py-3 text-xs font-extrabold text-white">
                {scenario.body[2]}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isMail = scenario.channel === 'mail'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
            isMail ? 'bg-orange-100 text-[#2563EB]' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {scenario.sender.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-bold text-[#020617]">{scenario.sender}</p>
            <p className="font-mono text-[11px] text-slate-400">{scenario.address}</p>
          </div>
        </div>
        <span className="font-mono text-[10px] text-slate-400">{scenario.time}</span>
      </div>

      <div className="mt-4">
        <p className="text-sm font-extrabold text-[#020617] mb-3">{scenario.subject}</p>
        <div className="space-y-2 font-mono text-xs leading-relaxed text-slate-700">
          {scenario.body.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
