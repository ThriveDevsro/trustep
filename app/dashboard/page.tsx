"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deriveAccountNameFromEmail,
  getAppAuthHeaders,
  getCurrentAppUser,
} from "@/lib/app-auth";
import type {
  AnalysisFeedback,
  RequestSource,
  RequestStatus,
  RiskLevel,
} from "@/lib/types";
import { getIdentityVerification } from "@/lib/identity-verification";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  FileUp,
  Globe,
  Loader2,
  ImageIcon,
  Mail,
  MessageCircle,
  MessageSquareText,
  Plus,
  Send,
  ShoppingBag,
  CircleDot,
} from "lucide-react";

interface SecurityRequest {
  id: string;
  submitted_by: string;
  text: string;
  risk_level: RiskLevel;
  reasons?: string[];
  identity_status?: import("@/lib/types").IdentityVerificationStatus | null;
  status: RequestStatus;
  source: RequestSource;
  feedback?: AnalysisFeedback | null;
  phone_from?: string;
  created_at: string;
}

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

const COMMUNICATION_CHANNELS = [
  {
    href: "/submit?tab=sms",
    icon: MessageCircle,
    title: "WhatsApp, Messenger a chat",
    note: "Skopírujte konverzáciu alebo vložte screenshot.",
    action: "Overiť konverzáciu",
  },
  {
    href: "/submit?tab=image",
    icon: ImageIcon,
    title: "Instagram a sociálne siete",
    note: "Skontrolujte profil, reklamu, správu alebo odkaz zo screenshotu.",
    action: "Nahrať screenshot",
  },
  {
    href: "/submit?tab=sms",
    icon: ShoppingBag,
    title: "Bazár a marketplace",
    note: "Preverte správu pred platbou, odoslaním kódu alebo presunom mimo platformy.",
    action: "Overiť správu",
  },
  {
    href: "/inboxes",
    icon: Mail,
    title: "E-mailové schránky",
    note: "Prepojte Gmail, Outlook alebo firemnú schránku na pravidelnú kontrolu.",
    action: "Spravovať schránky",
  },
] as const;

const ANALYSIS_TYPES = [
  { id: "message", label: "Správa", icon: MessageSquareText },
  { id: "url", label: "Odkaz", icon: Globe },
  { id: "document", label: "Dokument", icon: FileText },
] as const;

type AnalysisType = (typeof ANALYSIS_TYPES)[number]["id"];

const ANALYSIS_COPY: Record<
  AnalysisType,
  { title: string; helper: string; placeholder: string }
> = {
  message: {
    title: "Dostali ste podozrivú správu?",
    helper: "Skopírujte SMS, e-mail alebo chat aj s odkazmi a menom odosielateľa.",
    placeholder: "Sem vložte celú správu…",
  },
  url: {
    title: "Nie ste si istí webovou stránkou?",
    helper: "Porovnáme doménu, reputáciu a podobnosť s oficiálnymi webmi.",
    placeholder: "https://podozriva-stranka.sk/prihlasenie",
  },
  document: {
    title: "Nahrajte dokument alebo screenshot",
    helper: "Prečítame PDF alebo obrázok a overíme identitu, požiadavku, platobné údaje aj nezrovnalosti.",
    placeholder: "",
  },
};

function summarizeRequest(request: SecurityRequest): string {
  const normalized = request.text
    .replace(/^Analyzovaný inbound e-mail:\s*/i, "")
    .replace(/^Analyzuj túto webstránku z hľadiska podvodu\/phishingu:\s*/i, "")
    .replace(
      /^Analyzuj tento screenshot z hľadiska podvodu, phishingu alebo manipulatívnej komunikácie\.\s*/i,
      "",
    )
    .replace(/^Nahrávka hovoru od:\s*/i, "")
    .replace(/^SMS od:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 90 ? `${normalized.slice(0, 90)}...` : normalized;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSourceLabel(source: RequestSource): string {
  if (source === "web") return "Odkaz";
  if (source === "image") return "Dokument";
  if (source === "call") return "Hovor";
  return "Správa";
}

function getReportHref(id: string): string {
  return id.startsWith("local-") ? `/report/local/${id}` : `/report/${id}`;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState("FeelsOdd účet");
  const [requests, setRequests] = useState<SecurityRequest[]>([]);
  const [importedGuest, setImportedGuest] = useState(false);
  const [analysisIdentity, setAnalysisIdentity] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("message");
  const [analysisText, setAnalysisText] = useState("");
  const [analysisUrl, setAnalysisUrl] = useState("");
  const [analysisImage, setAnalysisImage] = useState<File | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const user = await getCurrentAppUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const authHeaders = await getAppAuthHeaders();
      const guestDraft = window.sessionStorage.getItem(
        "truststep_guest_result",
      );
      if (guestDraft) {
        try {
          const importResponse = await fetch("/api/guest-analysis/import", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: guestDraft,
          });
          if (importResponse.ok) {
            window.sessionStorage.removeItem("truststep_guest_result");
            setImportedGuest(true);
          }
        } catch {
          // Retry on refresh
        }
      }

      setAccountName(deriveAccountNameFromEmail(user.email));
      setAnalysisIdentity({ id: user.id, email: user.email });
      const requestsResponse = await fetch("/api/workspace/requests", {
        headers: authHeaders,
      });
      const nextRequests = requestsResponse.ok
        ? (((await requestsResponse.json()).requests ??
            []) as SecurityRequest[])
        : [];
      setRequests(nextRequests);

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  useEffect(() => {
    const rawRequestedType = searchParams.get("tab");
    const requestedType =
      rawRequestedType === "email" || rawRequestedType === "sms"
        ? "message"
        : rawRequestedType === "image"
          ? "document"
          : rawRequestedType;
    if (
      requestedType &&
      ANALYSIS_TYPES.some(({ id }) => id === requestedType)
    ) {
      setAnalysisType(requestedType as AnalysisType);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#f8faf9]">
        <Loader2 className="h-7 w-7 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  const riskyRequests = requests.filter(
    (request) =>
      request.risk_level === "high" || request.risk_level === "medium",
  );
  const pendingIncidents = riskyRequests.filter(
    (request) => request.status === "pending",
  );
  const recentRequests = requests.slice(0, 10);
  const activeAnalysisCopy = ANALYSIS_COPY[analysisType];

  function chooseAnalysisType(type: AnalysisType) {
    setAnalysisType(type);
    setAnalysisError("");
  }

  async function submitDashboardAnalysis(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!analysisIdentity || analysisLoading) return;
    if (analysisType === "message" && !analysisText.trim()) return;
    if (analysisType === "url" && !analysisUrl.trim()) return;
    if (analysisType === "document" && !analysisImage) return;

    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      const authHeaders = await getAppAuthHeaders();
      let response: Response;
      if (analysisType === "url") {
        response = await fetch("/api/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            url: analysisUrl.trim(),
            submittedBy: analysisIdentity.email,
            companyId: analysisIdentity.id,
          }),
        });
      } else if (analysisType === "document" && analysisImage) {
        const body = new FormData();
        body.append("document", analysisImage);
        body.append("submittedBy", analysisIdentity.email);
        body.append("companyId", analysisIdentity.id);
        response = await fetch("/api/analyze-image", {
          method: "POST",
          headers: authHeaders,
          body,
        });
      } else {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            text: analysisText,
            submittedBy: analysisIdentity.email,
            companyId: analysisIdentity.id,
            source: "email",
          }),
        });
      }
      const payload = (await response.json()) as {
        id?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Analýzu sa nepodarilo dokončiť.");
      if (payload.id) router.push(`/report/${payload.id}`);
      else router.push(`/submit?tab=${analysisType}`);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Analýzu sa nepodarilo dokončiť.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0A2550] antialiased">
      <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-[-.06em] text-[#0A2550] sm:text-5xl">
              Bezpečnostný prehľad
            </h1>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              {accountName} · citlivé rozhodnutia na jednom mieste
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white sm:flex">
              <div className="px-4 py-2.5">
                <p className="text-lg font-semibold tracking-[-.05em] text-[#0A2550]">{requests.length}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">Kontrol celkom</p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-lg font-semibold tracking-[-.05em] text-[#0A2550]">{pendingIncidents.length}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">Na preverenie</p>
              </div>
            </div>
            <Link
              href="/submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
            >
              <Plus className="h-4 w-4" />
              Nové overenie
            </Link>
          </div>
        </header>

        {importedGuest && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-bold text-emerald-900 shadow-sm">
            <CircleDot className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Vaše posledné bezplatné overenie sme úspešne priradili k vášmu
              účtu.
            </span>
          </div>
        )}

        <section className="mb-16 overflow-hidden rounded-[24px] bg-[#0A2550] px-5 py-7 text-white shadow-[0_24px_56px_rgba(10,37,80,.16)] sm:px-9 sm:py-9">
          <header className="mb-7 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
              Overte novú požiadavku
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-blue-100/80 sm:text-base">
              Správu, odkaz alebo dokument preveríme skôr, než sa z neho stane rozhodnutie.
            </p>
          </header>
          <div className="mb-4 grid max-w-xl grid-cols-3 gap-1.5 rounded-2xl bg-white/10 p-1.5">
            {ANALYSIS_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => chooseAnalysisType(id)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${analysisType === id ? "bg-white text-[#0A2550] shadow-sm" : "text-blue-100/75 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <form
            onSubmit={submitDashboardAnalysis}
            className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,.16)]"
          >
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
              <h3 className="text-lg font-semibold text-[#0A2550]">
                {activeAnalysisCopy.title}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {activeAnalysisCopy.helper}
              </p>
            </div>
            <div className="p-6 sm:p-8">
              {analysisType === "message" && (
                <textarea
                  required
                  autoFocus
                  value={analysisText}
                  onChange={(event) => setAnalysisText(event.target.value)}
                  placeholder={activeAnalysisCopy.placeholder}
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-sm leading-relaxed text-slate-900 outline-none transition placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              )}
              {analysisType === "url" && (
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    required
                    autoFocus
                    value={analysisUrl}
                    onChange={(event) => setAnalysisUrl(event.target.value)}
                    placeholder={activeAnalysisCopy.placeholder}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-4 pl-12 pr-4 font-mono text-sm font-semibold text-slate-900 outline-none transition placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                  />
                </div>
              )}
              {analysisType === "document" && (
                <div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file && file.size > MAX_DOCUMENT_BYTES) {
                        setAnalysisError("Dokument môže mať najviac 15 MB.");
                        setAnalysisImage(null);
                        event.target.value = "";
                        return;
                      }
                      setAnalysisError("");
                      setAnalysisImage(file);
                    }}
                  />
                  {analysisImage ? (
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <span className="truncate font-mono text-xs font-bold text-[#020617]">
                        {analysisImage.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAnalysisImage(null);
                          if (imageInputRef.current)
                            imageInputRef.current.value = "";
                        }}
                        className="text-xs font-bold text-[#2563EB]"
                      >
                        Odstrániť
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-9 text-center transition hover:border-slate-300"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
                        <FileUp className="h-6 w-6" />
                      </span>
                      <span className="mt-3 font-extrabold text-[#020617]">
                        Vybrať PDF, faktúru alebo screenshot
                      </span>
                      <span className="mt-1 text-xs font-semibold text-slate-400">
                        PDF, PNG, JPG, WEBP alebo HEIC · max. 15 MB
                      </span>
                    </button>
                  )}
                </div>
              )}
              {analysisError && (
                <p className="mt-5 border-l-4 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {analysisError}
                </p>
              )}
              <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  disabled={analysisLoading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-8 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(37,99,235,.2)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {analysisLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzujem…</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                  <span>Spustiť overenie</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="mb-12 border-t border-slate-300 pt-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-.04em]">
                Pripojené zdroje
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Overujte komunikáciu tam, kde skutočne vzniká.
              </p>
            </div>
            <Link
              href="/inboxes"
              className="text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Pridať schránku
            </Link>
          </div>
          <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {COMMUNICATION_CHANNELS.map(
              ({ href, icon: Icon, title, note, action }) => (
                <Link
                  key={title}
                  href={href}
                  className="group grid gap-3 py-5 sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center text-[#2563EB]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#020617] group-hover:text-[#2563EB]">
                      {title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {note}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#020617] group-hover:text-[#2563EB]">
                    {action}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>

        {/* Pending Alerts Banner */}
        {pendingIncidents.length > 0 && (
          <div className="mb-8 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
            <div className="flex items-center gap-3 font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {pendingIncidents.length === 1
                  ? "1 analýza vyžaduje vašu pozornosť"
                  : `${pendingIncidents.length} analýzy vyžadujú vašu pozornosť`}
              </span>
            </div>
            <span className="font-mono font-bold text-amber-700 uppercase">
              Pozor
            </span>
          </div>
        )}

        {/* History Table Container */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <h2 className="text-sm font-semibold text-[#020617]">
              Posledné overenia
            </h2>
            {requests.length > 0 && (
              <span className="font-mono text-xs font-semibold text-slate-400">
                {requests.length} celkovo
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {recentRequests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CircleDot className="mx-auto h-8 w-8 text-[#2563EB]" />
                <h3 className="mt-3 text-sm font-extrabold text-[#020617]">
                  Zatiaľ žiadne záznamy
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Zvoľte možnosť vyššie a overte prvú správu alebo odkaz.
                </p>
              </div>
            ) : (
              recentRequests.map((req) => {
                const verification = getIdentityVerification(
                  { riskLevel: req.risk_level, reasons: req.reasons ?? [], recommendation: "" },
                  req.text,
                );
                const dateStr = formatDate(req.created_at);

                return (
                  <Link
                    key={req.id}
                    href={getReportHref(req.id)}
                    className="group flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50/80"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Risk Indicator Pill */}
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          verification.status === "STOP_AND_VERIFY"
                            ? "bg-red-500"
                            : verification.status === "VERIFIED"
                              ? "bg-emerald-500"
                              : "bg-amber-400"
                        }`}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#020617] group-hover:text-[#2563EB] transition">
                          {summarizeRequest(req)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-500">
                            {getSourceLabel(req.source)}
                          </span>
                          <span>•</span>
                          <span>{dateStr}</span>
                          {req.phone_from && (
                            <>
                              <span>•</span>
                              <span>{req.phone_from}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold ${
                          verification.status === "STOP_AND_VERIFY"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : verification.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {(req.identity_status ?? verification.status).replaceAll("_", " ")}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#020617]" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="workspace-surface min-h-[70vh] bg-[#F8FAFC] px-5 py-16 text-center text-sm text-slate-500">
          Načítavam váš prehľad…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
