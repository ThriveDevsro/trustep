"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Eye, UserRound } from "lucide-react";
import { extractContactDetails, maskContactDetail } from "@/lib/identity-verification";

export default function AboutMeExposurePage() {
  const [identity, setIdentity] = useState("");
  const [details, setDetails] = useState("");
  const exposure = useMemo(() => extractContactDetails(details), [details]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-5 py-16 text-[#020617] sm:px-8 sm:py-24">
      <main className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2563EB]">Súkromie a impersonácia</p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-.055em] sm:text-5xl">
          Čo môžu útočníci vedieť o mne?
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
          Prehľad údajov, ktoré môžu pomôcť niekomu vierohodne sa za vás vydávať. Nič tu nevyhľadávame ani neodosielame — údaje spracujeme len vo vašom prehliadači a zobrazíme ich maskované.
        </p>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.05)] sm:p-8">
          <label className="text-sm font-semibold">Meno alebo verejný profil <span className="font-normal text-slate-400">(voliteľné)</span></label>
          <input
            value={identity}
            onChange={(event) => setIdentity(event.target.value)}
            placeholder="Napr. Jana Nováková alebo @jananovakova"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
          />
          <label className="mt-6 block text-sm font-semibold">Vaše verejné kontaktné údaje</label>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            placeholder="E-mail, telefón, verejná doména alebo odkaz na profil"
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">Nevkladajte heslá, celé čísla kariet ani doklady.</p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Eye className="h-4 w-4" /></span>
            <div>
              <h2 className="text-lg font-semibold">Možné podklady pre vydávanie sa za vás</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Útočník môže tieto údaje kombinovať s vaším menom, fotkou alebo pracovným kontextom.</p>
            </div>
          </div>
          <div className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
            {identity.trim() && <p className="py-4 text-sm"><span className="mr-3 inline-block w-28 text-slate-400">Identita</span><span className="font-medium">{identity.trim().slice(0, 2)}••••</span></p>}
            {exposure.length > 0 ? exposure.map((detail) => (
              <p key={`${detail.kind}-${detail.value}`} className="py-4 text-sm">
                <span className="mr-3 inline-block w-28 capitalize text-slate-400">{detail.kind === "phone" ? "Telefón" : detail.kind === "domain" ? "Doména" : detail.kind === "iban" ? "Platobný údaj" : "E-mail"}</span>
                <span className="font-mono font-medium">{maskContactDetail(detail)}</span>
              </p>
            )) : <p className="py-6 text-sm text-slate-500">Pridajte verejné údaje, ktoré chcete skontrolovať. Zobrazíme ich iba maskované.</p>}
          </div>
          <div className="mt-6 rounded-xl bg-[#F8FAFC] p-4 text-sm leading-6 text-slate-600">
            Najčastejšie zneužitie: správa z „nového čísla“, falošná zmena platobných údajov alebo e-mail, ktorý sa tvári ako známy kontakt. Dohodnite si s blízkymi alebo tímom jednoduché pravidlo: citlivú požiadavku vždy potvrdiť cez už známy kanál.
          </div>
        </section>

        <Link href="/vyskusat" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline">
          <UserRound className="h-4 w-4" /> Overiť osobu za správou <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
}
