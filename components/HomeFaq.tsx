"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const QUESTIONS = [
  [
    "Čo FeelsOdd overuje pred platbou alebo zmenou údajov?",
    "Porovnávame tvrdenú identitu odosielateľa, skutočnú doménu alebo odkaz, požadovanú akciu a znaky sociálneho inžinierstva. Výsledok vysvetlí, čo nesedí a ktorý krok odporúčame urobiť.",
  ],
  [
    "Musíme meniť existujúci proces schvaľovania?",
    "Nie. Začať môžete pri jednom kritickom momente, napríklad pri zmene IBAN alebo nečakanej faktúre. FeelsOdd pridáva kontrolu pred rozhodnutie, nie nový komplikovaný proces.",
  ],
  [
    "Vie tím pracovať so zdieľanými schránkami?",
    "Áno. Pri firemnom nasadení môžete pripojiť pracovné schránky a nastaviť, komu sa majú citlivé prípady odovzdať na ďalšie preverenie alebo schválenie.",
  ],
  [
    "Ako rýchlo vieme začať?",
    "Po vytvorení firemného účtu môže tím začať s manuálnym overovaním. Integrácie, schránky a detailnejšie pravidlá pridáte podľa rozsahu nasadenia.",
  ],
  [
    "Je výsledok automatické rozhodnutie o platbe?",
    "Nie. FeelsOdd dáva tímu zrozumiteľné bezpečnostné odporúčanie a dôvody, na ktorých stojí. Konečné rozhodnutie a schválenie zostávajú vo vašom procese.",
  ],
] as const;

export function HomeFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
          Často kladené otázky
        </h2>
        <div className="mt-12 border-t border-slate-200">
          {QUESTIONS.map(([question, answer], index) => (
            <div key={question} className="border-b border-slate-200">
              <button
                type="button"
                onClick={() => setOpen(open === index ? null : index)}
                className="flex w-full items-center justify-between gap-8 py-6 text-left text-lg font-semibold tracking-[-.025em] text-[#0A2550] sm:py-7 sm:text-xl"
                aria-expanded={open === index}
              >
                <span>{question}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open === index ? "rotate-180 text-[#2168E9]" : ""}`}
                />
              </button>
              {open === index && (
                <p className="max-w-3xl -mt-2 pb-7 text-sm leading-7 text-slate-600 sm:text-base">
                  {answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
