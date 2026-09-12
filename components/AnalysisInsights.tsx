"use client";

import { ExternalLink, Mail, PhoneCall } from "lucide-react";
import type { IdentityVerificationStatus, RiskLevel, VerificationResult } from "@/lib/types";
import { getIdentityVerification } from "@/lib/identity-verification";

interface AnalysisInsightsProps {
  riskLevel: RiskLevel;
  reasons: string[];
  recommendation: string;
  hostname?: string;
  title?: string;
  subject?: "url" | "content";
  tone?: "light" | "dark";
  identityStatus?: IdentityVerificationStatus;
  contentText?: string;
  knownDetails?: string;
  persistedComparison?: Pick<VerificationResult, "messageDetails" | "trustedDetails" | "comparisonSummary" | "detailComparisons"> | null;
}

const verdicts: Record<IdentityVerificationStatus, { label: string; title: string; accent: string; pill: string; surface: string }> = {
  VERIFIED: {
    label: "VERIFIED",
    title: "Kontaktný údaj sa zhoduje s vaším dôveryhodným údajom.",
    accent: "text-emerald-700",
    pill: "border-emerald-300 bg-emerald-50 text-emerald-800",
    surface: "bg-emerald-50/45",
  },
  IDENTITY_NOT_VERIFIED: {
    label: "IDENTITY NOT VERIFIED",
    title: "Nepodarilo sa potvrdiť, kto je na druhej strane.",
    accent: "text-amber-700",
    pill: "border-amber-300 bg-amber-50 text-amber-800",
    surface: "bg-amber-50/45",
  },
  DETAILS_CHANGED: {
    label: "DETAILS CHANGED",
    title: "Kontaktné alebo platobné údaje sa zmenili.",
    accent: "text-amber-700",
    pill: "border-amber-300 bg-amber-50 text-amber-800",
    surface: "bg-amber-50/45",
  },
  STOP_AND_VERIFY: {
    label: "STOP AND VERIFY",
    title: "Zastavte sa. Pred akciou overte druhú stranu iným kanálom.",
    accent: "text-red-700",
    pill: "border-red-300 bg-red-50 text-red-800",
    surface: "bg-red-50/45",
  },
} as const;

const REASON_PREFIXES = {
  identity: "[IDENTITY] ",
  request: "[REQUEST] ",
  consistency: "[CONSISTENCY] ",
  social: "[SOCIAL] ",
  technical: "[TECHNICAL] ",
} as const;

function parseVerificationReasons(reasons: string[]) {
  let identity = "Tvrdenú identitu sa zo zadaného obsahu nedá určiť.";
  let request = "Požadovanú akciu sa zo zadaného obsahu nedá jednoznačne určiť.";
  let consistency = "Identitu sa z dostupných údajov nedá nezávisle potvrdiť.";
  const social: string[] = [];
  const technical: string[] = [];
  const evidence: string[] = [];

  for (const reason of reasons) {
    if (reason.startsWith(REASON_PREFIXES.identity)) {
      identity = reason.slice(REASON_PREFIXES.identity.length);
    } else if (reason.startsWith(REASON_PREFIXES.request)) {
      request = reason.slice(REASON_PREFIXES.request.length);
    } else if (reason.startsWith(REASON_PREFIXES.consistency)) {
      consistency = reason.slice(REASON_PREFIXES.consistency.length);
    } else if (reason.startsWith(REASON_PREFIXES.social)) {
      social.push(reason.slice(REASON_PREFIXES.social.length));
    } else if (reason.startsWith(REASON_PREFIXES.technical)) {
      technical.push(reason.slice(REASON_PREFIXES.technical.length));
    } else {
      evidence.push(reason);
    }
  }

  return { identity, request, consistency, social, technical, evidence };
}

export function AnalysisInsights({
  riskLevel,
  reasons,
  recommendation,
  hostname,
  title,
  identityStatus,
  contentText = "",
  knownDetails = "",
  persistedComparison,
}: AnalysisInsightsProps) {
  const identity = getIdentityVerification(
    { riskLevel, reasons, recommendation },
    contentText,
    knownDetails,
  );
  const verdict = verdicts[identityStatus ?? identity.status];
  const action = identity.verificationMethod;
  const verification = parseVerificationReasons(reasons);
  const comparison = persistedComparison ?? {
    messageDetails: identity.messageDetails,
    trustedDetails: identity.trustedDetails,
    comparisonSummary: identity.comparisonSummary,
    detailComparisons: identity.detailComparisons,
  };
  const evidence = verification.evidence.slice(0, 4);

  return (
    <section>
      <div className={`border-y border-slate-300 px-5 py-7 sm:px-8 sm:py-9 ${verdict.surface}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-500">Výsledok overenia identity</p>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${verdict.pill}`}>
            {verdict.label}
          </span>
        </div>

        <h2 className="mt-6 max-w-3xl font-display text-3xl font-semibold leading-[1.06] tracking-[-.055em] text-[#020617] sm:text-4xl">
          {verdict.title}
        </h2>

        <div className="mt-7 border-t border-slate-300/80 pt-5">
          <p className="text-xs font-semibold text-slate-500">Čo urobiť teraz</p>
          <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-[#0F172A]">{action}</p>
        </div>
      </div>

      {comparison.detailComparisons.length > 0 && (
        <div className="mt-6 border-y border-slate-200">
          <p className="py-4 text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Presné porovnanie</p>
          {comparison.detailComparisons.map((item) => (
            <div key={`${item.kind}-${item.observedValue}`} className="grid gap-1 border-t border-slate-200 py-4 text-sm sm:grid-cols-[150px_1fr_1fr] sm:gap-4">
              <span className="capitalize text-slate-400">{item.kind === "phone" ? "Telefón" : item.kind === "iban" ? "IBAN" : item.kind === "domain" ? "Doména" : "E-mail"}</span>
              <span className="font-mono text-slate-600">{item.trustedValue}</span>
              <span className={item.status === "changed" ? "font-mono font-semibold text-red-700" : "font-mono font-semibold text-emerald-700"}>{item.status === "changed" ? `→ ${item.observedValue}` : "Zhodné"}</span>
            </div>
          ))}
        </div>
      )}

      {(hostname || title) && (
        <dl className="grid border-b border-slate-200 sm:grid-cols-2">
          {hostname && (
            <div className="min-w-0 px-0 py-5 sm:border-r sm:border-slate-200 sm:px-6 sm:first:pl-0">
              <dt className="text-xs font-semibold text-slate-400">Kontrolovaná doména</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold text-[#020617]">{hostname}</dd>
            </div>
          )}
          {title && (
            <div className="min-w-0 border-t border-slate-200 px-0 py-5 sm:border-t-0 sm:px-6">
              <dt className="text-xs font-semibold text-slate-400">Názov stránky</dt>
              <dd className="mt-1 truncate text-sm font-semibold text-[#020617]">{title}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="pt-8">
          <h3 className="font-display text-2xl font-semibold tracking-[-.045em] text-[#020617]">
          Identita a údaje
        </h3>
        <dl className="mt-5 border-y border-slate-200">
          <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
            <dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Kto tvrdí, že komunikuje</dt>
            <dd className="text-sm font-medium leading-6 text-[#0F172A]">{identity.claimedIdentity}</dd>
          </div>
          <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
            <dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Čo od vás žiada</dt>
            <dd className="text-sm font-medium leading-6 text-[#0F172A]">{identity.requestedAction}</dd>
          </div>
          <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
            <dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Údaje v komunikácii</dt>
            <dd className="text-sm leading-6 text-slate-700">{verification.consistency}</dd>
          </div>
          <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
            <dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Nájdené kontakty</dt>
            <dd className="text-sm leading-6 text-slate-700">
              {comparison.messageDetails.length > 0
                ? comparison.messageDetails.map((detail) => detail.value).join(" · ")
                : "V zadanom obsahu sme nenašli samostatný kontaktný alebo platobný údaj."}
            </dd>
          </div>
          <div className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
            <dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Dôveryhodný kontakt</dt>
            <dd className="text-sm leading-6 text-slate-700">
              {comparison.trustedDetails.length > 0
                ? comparison.trustedDetails.map((detail) => detail.value).join(" · ")
                : "Neboli pridané žiadne predtým overené údaje na porovnanie."}
            </dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
            <dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Porovnanie</dt>
            <dd className="text-sm leading-6 text-slate-700">{comparison.comparisonSummary}</dd>
          </div>
        </dl>
      </div>

      {identity.safeActions.length > 0 && identity.status !== "VERIFIED" && (
        <div className="mt-8 border-y border-slate-200 py-6">
          <p className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Overiť bezpečným kanálom</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Tieto akcie používajú iba kontakt, ktorý ste si uložili pred touto komunikáciou.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {identity.safeActions.map((action) => {
              const href = action.kind === "email"
                ? `mailto:${action.value}`
                : action.kind === "phone"
                  ? `tel:${action.value.replace(/[^+\d]/g, "")}`
                  : `https://${action.value.replace(/^https?:\/\//, "")}`;
              const Icon = action.kind === "email" ? Mail : action.kind === "phone" ? PhoneCall : ExternalLink;
              const label = action.kind === "email" ? "Napísať na uložený e-mail" : action.kind === "phone" ? "Zavolať na uložené číslo" : "Otvoriť uloženú doménu";
              return <a key={`${action.kind}-${action.value}`} href={href} target={action.kind === "domain" ? "_blank" : undefined} rel={action.kind === "domain" ? "noreferrer" : undefined} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#1747B8]"><Icon className="h-3.5 w-3.5" />{label}</a>;
            })}
          </div>
        </div>
      )}

      {evidence.length > 0 && (
        <div className="pt-8">
          <h3 className="font-display text-2xl font-semibold tracking-[-.045em] text-[#020617]">
            Dôkazy v komunikácii
          </h3>
          <ol className="mt-5 border-y border-slate-200">
            {evidence.map((signal, index) => {
              const divider = signal.indexOf(" — ");
              const evidence = divider > -1 ? signal.slice(0, divider) : "";
              const explanation = divider > -1 ? signal.slice(divider + 3) : signal;
              return (
                <li key={`${signal}-${index}`} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-slate-200 py-5 last:border-b-0">
                  <span className={`text-sm font-semibold ${verdict.accent}`}>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-medium leading-6 text-slate-700">{explanation}</p>
                    {evidence && (
                      <p className="mt-2 border-l-2 border-slate-300 pl-3 font-mono text-xs leading-5 text-slate-500">{evidence}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
