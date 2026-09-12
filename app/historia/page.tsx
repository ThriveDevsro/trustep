"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Loader2 } from "lucide-react";
import { getAppAuthHeaders, getCurrentAppUser } from "@/lib/app-auth";
import type { IdentityVerificationStatus, RequestSource, RiskLevel } from "@/lib/types";
import { getIdentityVerification } from "@/lib/identity-verification";

type Item = {
  id: string;
  text: string;
  source: RequestSource;
  risk_level: RiskLevel;
  reasons?: string[];
  identity_status?: IdentityVerificationStatus | null;
  created_at: string;
};

function reportHref(id: string) {
  return id.startsWith("local-") || id.startsWith("devreq-")
    ? `/report/local/${id}`
    : `/report/${id}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentAppUser();
      if (!user) return router.replace("/login?next=%2Fhistoria");
      const response = await fetch("/api/workspace/requests", {
        headers: await getAppAuthHeaders(),
      });
      if (response.ok)
        setItems(((await response.json()).requests ?? []) as Item[]);
      setLoading(false);
    }
    void load();
  }, [router]);

  if (loading)
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
      </div>
    );
  const risky = items.filter((item) => item.risk_level !== "low").length;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-5 border-b border-slate-300 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-.055em] text-[#020617]">
            História
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Všetky podnety, ktoré ste už preverili.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#020617] px-5 text-sm font-bold text-white transition hover:bg-[#2563EB]"
        >
          Nová analýza <ArrowRight className="h-4 w-4" />
        </Link>
      </header>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
        <span>
          <strong className="text-[#020617]">{items.length}</strong> kontrol
          celkovo
        </span>
        <span>
          <strong className="text-[#020617]">{risky}</strong> vyžadovalo
          pozornosť
        </span>
      </div>
      <section className="mt-7 border-y border-slate-200">
        {items.length ? (
          <div className="divide-y divide-slate-200">
            {items.map((item) => {
              const verification = getIdentityVerification(
                { riskLevel: item.risk_level, reasons: item.reasons ?? [], recommendation: "" },
                item.text,
              );
              const status = item.identity_status ?? verification.status;
              const label = status.replaceAll("_", " ");
              const color =
                status === "STOP_AND_VERIFY"
                  ? "text-red-700"
                  : status === "VERIFIED"
                    ? "text-emerald-700"
                    : "text-amber-700";
              return (
                <Link
                  key={item.id}
                  href={reportHref(item.id)}
                  className="group grid gap-3 py-5 sm:grid-cols-[155px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <p className={`text-xs font-bold ${color}`}>{label}</p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#020617] group-hover:text-[#2563EB]">
                      {item.text.replace(/\s+/g, " ").slice(0, 130)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.source} ·{" "}
                      {new Date(item.created_at).toLocaleString("sk-SK")}
                    </p>
                  </div>
                  <ArrowRight className="hidden h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#2563EB] sm:block" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Clock3 className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-[#020617]">
              Zatiaľ nemáte žiadnu analýzu
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex text-sm font-bold text-[#2563EB]"
            >
              Spustiť analýzu
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
