"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

const INCLUDED = [
  "Krátko prejdeme vaše rizikové platobné situácie.",
  "Ukážeme postup overenia na konkrétnom príklade.",
  "Spolu zhodnotíme vhodný rozsah nasadenia.",
];

export default function DemoBookingPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        company: form.get("company"),
        message: form.get("message"),
        source: "demo-booking",
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setStatus("error");
      setError(payload.error || "Dopyt sa nepodarilo odoslať. Skúste to, prosím, znova.");
      return;
    }

    setStatus("success");
  }

  return (
    <main className="min-h-[calc(100vh-82px)] bg-[#081C3B] px-5 py-12 text-white sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1240px]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-200 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Späť na FeelsOdd
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:gap-20">
          <section className="pt-2">
            <h1 className="max-w-xl text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl">
              Pozrime sa, kde môže FeelsOdd chrániť váš tím
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Počas krátkej ukážky sa zameriame na vaše platby, zmeny účtov a citlivú komunikáciu. Bez záväzku a bez všeobecnej prezentácie.
            </p>
            <ul className="mt-10 space-y-5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-6 text-[#0F172A] shadow-[0_24px_70px_rgba(0,0,0,.22)] sm:p-9">
            {status === "success" ? (
              <div className="flex min-h-[440px] flex-col justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF2FF] text-[#2563EB]"><Check className="h-6 w-6" strokeWidth={3} /></div>
                <h2 className="mt-6 font-display text-4xl font-semibold tracking-[-.055em]">Ďakujeme</h2>
                <p className="mt-4 max-w-md text-base leading-7 text-slate-600">Váš dopyt sme prijali. Ozveme sa vám na uvedený e-mail a dohodneme si vhodný termín ukážky.</p>
                <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#2563EB]">Späť na úvod <ArrowRight className="h-4 w-4" /></Link>
              </div>
            ) : (
              <>
                <h2 className="font-display text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Dohodnite si ukážku</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">Vyplňte pár údajov. Ozveme sa vám s návrhom termínu.</p>
                <form onSubmit={submit} className="mt-8 grid gap-5">
                  <label className="grid gap-2 text-sm font-bold">Meno a priezvisko<input required name="name" autoComplete="name" className="h-12 rounded-lg border border-slate-200 px-4 text-base font-medium outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" placeholder="Ján Novák" /></label>
                  <label className="grid gap-2 text-sm font-bold">Firemný e-mail<input required name="email" type="email" autoComplete="email" className="h-12 rounded-lg border border-slate-200 px-4 text-base font-medium outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" placeholder="jan@firma.sk" /></label>
                  <label className="grid gap-2 text-sm font-bold">Firma<input required name="company" autoComplete="organization" className="h-12 rounded-lg border border-slate-200 px-4 text-base font-medium outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" placeholder="Názov firmy" /></label>
                  <label className="grid gap-2 text-sm font-bold">Čo chcete pokryť? <span className="font-medium text-slate-400">(voliteľné)</span><textarea name="message" rows={3} className="resize-none rounded-lg border border-slate-200 px-4 py-3 text-base font-medium outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" placeholder="Napríklad zmeny IBAN, faktúry alebo schvaľovanie platieb." /></label>
                  {status === "error" && <p className="text-sm font-semibold text-red-600">{error}</p>}
                  <button disabled={status === "sending"} className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#155CD8] disabled:cursor-not-allowed disabled:opacity-70">
                    {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Odosielam…</> : <>Odoslať dopyt <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
