"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileUp,
  Globe,
  Loader2,
  MessageSquareText,
  Phone,
  Send,
  X,
} from "lucide-react";
import { AnalysisInsights } from "@/components/AnalysisInsights";
import { getAppAuthHeaders, getCurrentAppUser } from "@/lib/app-auth";
import { saveLocalRequest } from "@/lib/local-history";
import type { RequestSource, TrustedIdentity } from "@/lib/types";

const DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000001";
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

const INPUT_TYPES = [
  { id: "email", label: "Správa", icon: MessageSquareText },
  { id: "url", label: "Odkaz", icon: Globe },
  { id: "image", label: "Dokument", icon: FileText },
] as const;

const COPY = {
  email: {
    title: "Dostali ste podozrivú správu?",
    helper:
      "Skopírujte SMS, e-mail alebo chat aj s odkazmi a menom odosielateľa.",
    placeholder:
      "Sem vložte celú správu…",
  },
  sms: {
    title: "Vložte obsah, ktorý chcete overiť",
    helper: "Skopírujte konverzáciu aj s odkazmi a podstatným kontextom.",
    placeholder: "Sem vložte text SMS správy alebo chatu…",
  },
  url: {
    title: "Nie ste si istí webovou stránkou?",
    helper:
      "Vložte adresu stránky. Porovnáme doménu, reputáciu a podobnosť s oficiálnymi webmi.",
    placeholder: "https://podozriva-stranka.sk/prihlasenie",
  },
  image: {
    title: "Nahrajte dokument alebo screenshot",
    helper:
      "Prečítame PDF alebo obrázok a overíme identitu, požiadavku, platobné údaje aj nezrovnalosti.",
    placeholder: "",
  },
  phone: {
    title: "Vložte obsah, ktorý chcete overiť",
    helper:
      "Vyhľadáme verejne dostupné údaje o firme, krajine a type linky. Súkromné osoby neidentifikujeme.",
    placeholder: "+421 9xx xxx xxx",
  },
};

type InputType = keyof typeof COPY;

function isDirectUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface AnalyzeApiResponse {
  id: string | null;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
  recommendation?: string;
  hostname?: string;
  title?: string;
  extractedText?: string;
  transcription?: string;
  phone?: string;
  formattedPhone?: string;
  companyName?: string | null;
  countryCode?: string | null;
  carrier?: string | null;
  lineType?: string | null;
  lookupAvailable?: boolean;
  reputationStatus?: "safe" | "suspicious" | "dangerous" | "unknown";
  reputationScore?: number | null;
  reputationReports?: number | null;
  reputationSource?: string | null;
  trustStepReports?: number;
  manualLookupUrl?: string;
  domainTechnical?: {
    hostname: string;
    ipv4Count: number;
    mxConfigured: boolean | null;
    cname: string | null;
    tls: {
      validFrom: string | null;
      validTo: string | null;
      issuer: string | null;
    } | null;
  } | null;
  officialDomainChecks?: Array<{
    brand: string;
    hostname: string;
    officialDomains: string[];
    status: "official" | "mismatch";
  }>;
  businessAddress?: string | null;
  businessMapsUrl?: string | null;
  identitySource?: string | null;
  error?: string;
}

interface ShareDraftPayload {
  id: string;
  title?: string;
  text?: string;
  url?: string;
  file?: { name: string; type: string; dataUrl: string };
}

function isInputType(value: string): value is InputType {
  return INPUT_TYPES.some(({ id }) => id === value);
}

function sourceFor(type: InputType): RequestSource {
  if (type === "url") return "web";
  if (type === "image") return "image";
  if (type === "sms") return "sms";
  if (type === "phone") return "call";
  return "email";
}

function fallbackRecommendation(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "high")
    return "Nereagujte a nič neposielajte. Kontaktujte danú osobu alebo firmu cez oficiálny kontakt.";
  if (riskLevel === "medium")
    return "Pred ďalším krokom si informácie overte iným, dôveryhodným kanálom.";
  return "Nenašli sa silné známky podvodu. Pri citlivej požiadavke aj tak postupujte opatrne.";
}

export default function SubmitPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicTrial = pathname === "/vyskusat";
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [type, setType] = useState<InputType>("email");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneContext, setPhoneContext] = useState("");
  const [knownDetails, setKnownDetails] = useState("");
  const [trustedIdentities, setTrustedIdentities] = useState<TrustedIdentity[]>([]);
  const [selectedTrustedId, setSelectedTrustedId] = useState("");
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [companyId, setCompanyId] = useState(DEMO_COMPANY_ID);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestUsed, setGuestUsed] = useState(false);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [planLimitReached, setPlanLimitReached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inlineResult, setInlineResult] = useState<AnalyzeApiResponse | null>(
    null,
  );
  const [analysisSubject, setAnalysisSubject] = useState<InputType>("email");
  const [phoneReportState, setPhoneReportState] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");
  const activeCopy = COPY[type];

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentAppUser();
        if (user) {
          if (isPublicTrial) {
            router.replace(`/submit${window.location.search}`);
            return;
          }
          router.replace(`/dashboard${window.location.search}`);
          return;
        } else {
          if (!isPublicTrial) {
            const next = `${window.location.pathname}${window.location.search}`;
            router.replace(`/login?next=${encodeURIComponent(next)}`);
            return;
          }
          setIsLoggedIn(false);
          setCompanyId(DEMO_COMPANY_ID);
          setSubmittedBy("guest@truststep.sk");
          setGuestUsed(
            window.localStorage.getItem("truststep_guest_analysis_used") ===
              "true",
          );
        }
      } finally {
        setAuthChecked(true);
      }
    }

    void loadUser();
  }, [isPublicTrial, router]);

  useEffect(() => {
    if (!authChecked || !isLoggedIn) return;
    void (async () => {
      try {
        const response = await fetch("/api/trusted-identities", {
          headers: await getAppAuthHeaders(),
        });
        if (!response.ok) return;
        const payload = await response.json() as { identities?: TrustedIdentity[] };
        setTrustedIdentities(payload.identities ?? []);
      } catch {
        // The manual trusted-detail field remains available if the address book is unavailable.
      }
    })();
  }, [authChecked, isLoggedIn]);

  useEffect(() => {
    if (!imageFile || !imageFile.type.startsWith("image/")) {
      setImagePreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    async function hydrateInput() {
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get("tab")?.trim() ?? "";
      const sharedUrl =
        params.get("shared_url")?.trim() || params.get("url")?.trim() || "";
      const sharedText = [
        params.get("shared_title"),
        params.get("shared_text"),
        params.get("text"),
      ]
        .filter(Boolean)
        .join("\n\n")
        .trim();
      const draftId = params.get("share_draft")?.trim() ?? "";
      const shareError = params.get("share_error")?.trim() ?? "";

      if (requestedTab === "sms" || requestedTab === "message") setType("email");
      else if (requestedTab === "document") setType("image");
      else if (requestedTab === "identity") setType("email");
      else if (isInputType(requestedTab)) setType(requestedTab);
      if (shareError === "file_too_large")
        setError("Zdieľaný súbor je príliš veľký.");
      if (shareError === "unsupported_file")
        setError("Tento typ súboru zatiaľ nevieme spracovať.");
      if (shareError === "failed")
        setError("Zdieľaný obsah sa nepodarilo načítať.");

      if (draftId) {
        try {
          const response = await fetch(`/api/share-drafts/${draftId}`);
          if (!response.ok) return;
          const draft = (await response.json()) as ShareDraftPayload;

          if (draft.url) {
            setType("url");
            setUrl(draft.url);
          } else if (draft.file?.dataUrl) {
            const fileResponse = await fetch(draft.file.dataUrl);
            const blob = await fileResponse.blob();
            const file = new File([blob], draft.file.name || "shared-file", {
              type: draft.file.type || blob.type,
            });
            if (file.type.startsWith("audio/")) {
              setError(
                "Nahrávky hovorov zatiaľ nepodporujeme. Pošlite text, screenshot, odkaz alebo e-mail.",
              );
              return;
            } else {
              setType("image");
              setImageFile(file);
            }
          } else {
            const draftText = [draft.title, draft.text]
              .filter(Boolean)
              .join("\n\n")
              .trim();
            if (draftText) {
              setType("email");
              setText(draftText);
            }
          }
          setNotice("Zdieľaný obsah je pripravený na kontrolu.");
          return;
        } catch {
          setError("Zdieľaný obsah sa nepodarilo načítať.");
        }
      }

      if (sharedUrl) {
        setType("url");
        setUrl(sharedUrl);
        setNotice("Odkaz je pripravený na kontrolu.");
      } else if (sharedText) {
        if (isDirectUrl(sharedText)) {
          setType("url");
          setUrl(sharedText);
          setNotice("Odkaz je pripravený na kontrolu domény.");
        } else {
          setType("email");
          setText(sharedText);
          setNotice("Text je pripravený na kontrolu.");
        }
      }
    }

    void hydrateInput();
  }, []);

  function chooseType(nextType: InputType) {
    setType(nextType);
    setError("");
    setNotice("");
    setInlineResult(null);
    setPhoneReportState("idle");
    window.history.replaceState(
      null,
      "",
      `${isPublicTrial ? "/vyskusat" : "/submit"}?tab=${nextType}`,
    );
  }

  function selectTrustedIdentity(identity: TrustedIdentity) {
    const details = [identity.email, identity.phone, identity.domain, identity.iban]
      .filter((value): value is string => Boolean(value))
      .join("\n");
    setKnownDetails(details);
    setSelectedTrustedId(identity.id);
  }

  function hasInput() {
    if (!submittedBy) return false;
    if (type === "url") return Boolean(url.trim());
    if (type === "phone") return Boolean(phone.trim());
    if (type === "image") return Boolean(imageFile);
    if (type === "email") return Boolean(emailFile || text.trim());
    return Boolean(text.trim());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasInput()) return;
    const submittedType: InputType =
      (type === "email" || type === "sms") && isDirectUrl(text) ? "url" : type;
    const submittedUrl =
      submittedType === "url"
        ? type === "url"
          ? url.trim()
          : text.trim()
        : "";

    if (!isLoggedIn && guestUsed) {
      setGuestLimitReached(true);
      setInlineResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setInlineResult(null);
    setPhoneReportState("idle");
    setAnalysisSubject(submittedType);

    try {
      let response: Response;
      const authHeaders = await getAppAuthHeaders();

      if (submittedType === "phone") {
        setLoadingStage("Overujem verejné údaje o čísle…");
        response = await fetch("/api/analyze-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ phone, context: phoneContext }),
        });
      } else if (submittedType === "url") {
        setLoadingStage("Kontrolujem stránku a doménu…");
        response = await fetch("/api/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ url: submittedUrl, submittedBy, companyId }),
        });
      } else if (submittedType === "image" && imageFile) {
        setLoadingStage(
          imageFile.type === "application/pdf" || imageFile.name.toLowerCase().endsWith(".pdf")
            ? "Čítam a overujem PDF dokument…"
            : "Čítam text zo screenshotu…",
        );
        const body = new FormData();
        body.append("document", imageFile);
        body.append("submittedBy", submittedBy);
        body.append("companyId", companyId);
        response = await fetch("/api/analyze-image", {
          method: "POST",
          headers: authHeaders,
          body,
        });
      } else if (submittedType === "email" && emailFile) {
        setLoadingStage("Spracúvam hlavičky a prílohy e-mailu…");
        const body = new FormData();
        body.append("email", emailFile);
        body.append("submittedBy", submittedBy);
        body.append("companyId", companyId);
        response = await fetch("/api/analyze-email-file", {
          method: "POST",
          headers: authHeaders,
          body,
        });
      } else {
        setLoadingStage("Overujem identitu, požiadavku a rizikové signály…");
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            text:
              submittedType === "sms"
                ? `SMS správa na overenie:\n\n${text}`
                : text,
            submittedBy,
            companyId,
            source: sourceFor(submittedType),
          }),
        });
      }

      const payload = (await response.json()) as AnalyzeApiResponse;
      if (response.status === 403 && !isLoggedIn) {
        window.localStorage.setItem("truststep_guest_analysis_used", "true");
        setGuestUsed(true);
        setGuestLimitReached(true);
        return;
      }
      if (response.status === 429 && isLoggedIn) {
        setPlanLimitReached(true);
        setError(payload.error || "Dosiahli ste mesačný limit svojho plánu.");
        return;
      }
      if (!response.ok)
        throw new Error(payload.error || "Analýzu sa nepodarilo dokončiť.");

      if (payload.id) {
        if (selectedTrustedId) {
          try {
            await fetch(`/api/requests/${payload.id}/verification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(await getAppAuthHeaders()) },
              body: JSON.stringify({ trustedIdentityId: selectedTrustedId }),
            });
          } catch {
            // The report remains available; a temporary session comparison is still shown below.
          }
        }
        if (knownDetails.trim()) {
          window.sessionStorage.setItem(
            `truststep_known_details_${payload.id}`,
            knownDetails.trim(),
          );
        }
        router.push(`/report/${payload.id}`);
        return;
      }

      const recommendation =
        payload.recommendation || fallbackRecommendation(payload.riskLevel);
      if (isLoggedIn) {
        saveLocalRequest({
          companyId,
          submittedBy,
          text:
            submittedType === "url"
              ? `URL: ${submittedUrl}`
              : submittedType === "phone"
                ? `Telefón: ${payload.phone ?? phone}`
                : submittedType === "image"
                  ? payload.extractedText || imageFile?.name || "Screenshot"
                  : text,
          riskLevel: payload.riskLevel,
          reasons: payload.reasons,
          recommendation,
          source: sourceFor(submittedType),
        });
      } else {
        window.localStorage.setItem("truststep_guest_analysis_used", "true");
        const guestText =
          submittedType === "url"
            ? `URL: ${submittedUrl}`
            : submittedType === "phone"
              ? `Telefón: ${payload.phone ?? phone}`
              : submittedType === "image"
                ? payload.extractedText || imageFile?.name || "Screenshot"
                : text;
        window.sessionStorage.setItem(
          "truststep_guest_result",
          JSON.stringify({
            text: guestText,
            riskLevel: payload.riskLevel,
            reasons: payload.reasons,
            recommendation,
            source: sourceFor(submittedType),
          }),
        );
        setGuestUsed(true);
      }
      setInlineResult({ ...payload, recommendation });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Analýzu sa nepodarilo dokončiť.",
      );
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  }

  async function reportPhoneNumber() {
    if (!inlineResult?.phone || !isLoggedIn) return;
    setPhoneReportState("saving");
    try {
      const response = await fetch("/api/phone-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAppAuthHeaders()),
        },
        body: JSON.stringify({
          phone: inlineResult.phone,
          category: "suspected_scam",
          notes: phoneContext,
        }),
      });
      if (!response.ok) throw new Error();
      setPhoneReportState("done");
    } catch {
      setPhoneReportState("error");
    }
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div
      className={
        isPublicTrial
          ? "min-h-screen bg-[#F8FAFC] px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8"
          : "pt-10 pb-16"
      }
    >
      <div
        className={`mx-auto w-full max-w-3xl ${isPublicTrial && !inlineResult ? "flex flex-col justify-center" : ""}`}
      >
        {/* Navigation Back Link */}
        {isPublicTrial && (
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#020617]"
            >
              <ArrowLeft className="h-4 w-4" /> Späť na úvod
            </Link>
          </div>
        )}

        {/* Page Title Header */}
        <header className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-[-.055em] text-[#020617] sm:text-5xl">
            Overte podozrivú komunikáciu
          </h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
            Pošlite správu, odkaz alebo screenshot. FEELSODD zistí, kto sa
            ozýva, čo od vás žiada a či je bezpečné konať.
          </p>
        </header>

        {/* Format Selector Bar */}
        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5">
          {INPUT_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseType(id)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                type === id
                  ? "bg-[#020617] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#020617]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Main Card Container */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,.07)]"
        >
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
            <div>
              <h2 className="text-lg font-semibold text-[#020617]">
                {activeCopy.title}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {activeCopy.helper}
              </p>
            </div>

            {type === "email" && (
              <div>
                <input
                  ref={emailInputRef}
                  type="file"
                  accept=".eml,message/rfc822"
                  className="hidden"
                  onChange={(event) =>
                    setEmailFile(event.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  onClick={() => emailInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#2563EB] transition hover:border-[#2563EB] hover:bg-[#fff8f5]"
                >
                  <FileUp className="h-3.5 w-3.5" /> Nahrať .eml súbor
                </button>
              </div>
            )}
          </div>

          {/* Card Body & Fields */}
          <div className="p-6 sm:p-8">
            {notice && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs font-bold text-[#020617]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                <span>{notice}</span>
              </div>
            )}

            {/* URL Input */}
            {type === "url" && (
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  required
                  autoFocus
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={activeCopy.placeholder}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-4 pl-12 pr-4 font-mono text-sm font-semibold text-slate-900 outline-none transition placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>
            )}

            {type === "phone" && (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    autoFocus
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={activeCopy.placeholder}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone-context"
                    className="text-xs font-bold text-[#020617]"
                  >
                    Čo od vás volajúci chcel?{" "}
                    <span className="font-medium text-slate-400">
                      (voliteľné, ale odporúčané)
                    </span>
                  </label>
                  <textarea
                    id="phone-context"
                    value={phoneContext}
                    onChange={(event) => setPhoneContext(event.target.value)}
                    rows={4}
                    placeholder="Napr. volajúci tvrdil, že je z banky, žiadal nadiktovať kód z SMS a tlačil na rýchlu reakciu..."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                  />
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                    Overíme verejné údaje o čísle a posúdime aj nátlakové alebo
                    podvodné vzorce v popise hovoru. Neukladáme ho ako kontakt
                    ani neodhaľujeme identitu súkromných osôb.
                  </p>
                </div>
              </div>
            )}

            {/* Text & Email Area */}
            {(type === "email" || type === "sms") && (
              <div>
                {emailFile ? (
                  <SelectedFile
                    file={emailFile}
                    onRemove={() => {
                      setEmailFile(null);
                      if (emailInputRef.current)
                        emailInputRef.current.value = "";
                    }}
                  />
                ) : (
                  <textarea
                    required
                    autoFocus
                    value={text}
                    onChange={(event) => {
                      const nextText = event.target.value;
                      setText(nextText);
                      if (/^https?:\/\/\S+$/i.test(nextText.trim())) {
                        setUrl(nextText.trim());
                        setType("url");
                        setNotice(
                          "Rozpoznali sme odkaz — preveríme doménu, SSL certifikát aj prihlasovacie brány.",
                        );
                      }
                    }}
                    placeholder={activeCopy.placeholder}
                    rows={6}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-sm leading-relaxed text-slate-900 outline-none transition placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                  />
                )}
              </div>
            )}

            {/* Image Screenshot Field */}
            {type === "image" && (
              <UploadField
                refObject={imageInputRef}
                accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
                file={imageFile}
                label="Vybrať PDF, faktúru alebo screenshot"
                note="PDF, PNG, JPG, WEBP alebo HEIC · maximálne 15 MB"
                onSelect={(file) => {
                  if (file && file.size > MAX_DOCUMENT_BYTES) {
                    setError("Dokument môže mať najviac 15 MB.");
                    setImageFile(null);
                    return;
                  }
                  setError("");
                  setImageFile(file);
                }}
                onRemove={() => {
                  setImageFile(null);
                  if (imageInputRef.current) imageInputRef.current.value = "";
                }}
              >
                {imageFile && imagePreview && (
                  <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <Image
                      src={imagePreview}
                      alt="Náhľad obrázka"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </UploadField>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <label htmlFor="known-details" className="text-xs font-bold text-[#020617]">
                Údaj, ktorému už dôverujete <span className="font-medium text-slate-400">(voliteľné)</span>
              </label>
              <input
                id="known-details"
                value={knownDetails}
                onChange={(event) => setKnownDetails(event.target.value)}
                placeholder="Uložené číslo, oficiálny e-mail, doména alebo IBAN z predošlej faktúry"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Porovnáme iba zhodu s údajom v komunikácii. Nevolajte ani nepíšte späť cez nový kontakt.
              </p>
              {isLoggedIn && trustedIdentities.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500">Alebo vyberte z dôveryhodných kontaktov</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {trustedIdentities.map((identity) => (
                      <button
                        key={identity.id}
                        type="button"
                        onClick={() => selectTrustedIdentity(identity)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${selectedTrustedId === identity.id ? "border-[#2563EB] bg-blue-50 text-[#1747B8]" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                      >
                        {identity.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isLoggedIn && trustedIdentities.length === 0 && (
                <Link href="/doveryhodne-kontakty" className="mt-3 inline-block text-xs font-semibold text-[#2563EB] hover:underline">
                  Pridať dôveryhodný kontakt
                </Link>
              )}
            </div>

            {/* Errors */}
            {error && (
              <p className="mt-6 border-l-4 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
                {error}
              </p>
            )}

            {/* Guest Limit Warning */}
            {guestLimitReached && !isLoggedIn && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-base font-extrabold text-[#020617]">
                  Bezplatné overenie ste už využili
                </h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                  Vytvorte si bezplatný účet pre ďalšie analýzy a ukladanie
                  histórie výsledkov.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/register?next=%2Fdashboard%3Fwelcome%3D1"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#020617] px-5 text-xs font-extrabold text-white transition hover:bg-[#071d3d]"
                  >
                    Vytvoriť bezplatný účet
                  </Link>
                  <Link
                    href="/login?next=%2Fsubmit"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-xs font-bold text-[#020617] transition hover:bg-slate-50"
                  >
                    Prihlásiť sa
                  </Link>
                </div>
              </div>
            )}

            {/* Plan Limit Warning */}
            {planLimitReached && isLoggedIn && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-medium leading-relaxed text-slate-600">
                  Dosiahli ste mesačný limit. Vyšší plán vám odomkne neobmedzené
                  overenia pre celý tím.
                </p>
                <Link
                  href="/cennik"
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-[#020617] px-5 text-xs font-extrabold text-white"
                >
                  Zobraziť cenník plánov
                </Link>
              </div>
            )}

            {/* Bottom Form Toolbar */}
            <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={
                  loading ||
                  !hasInput() ||
                  guestLimitReached ||
                  planLimitReached
                }
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-8 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(37,99,235,.2)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{loadingStage}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Overiť komunikáciu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Inline Analysis Result UI */}
        {inlineResult && (
          <div className="mt-10 border-t border-slate-200 pt-8 sm:pt-10">
            {inlineResult.domainTechnical && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  <Globe className="mr-2 inline h-4 w-4 text-[#2563EB]" />{" "}
                  Technické overenie domény
                </div>
                <p className="mt-2 font-mono text-sm font-semibold text-[#020617]">
                  {inlineResult.domainTechnical.hostname}
                </p>
                <div className="mt-4 grid gap-3 text-xs font-medium text-slate-600 sm:grid-cols-3">
                  <p>
                    <span className="block text-slate-400">DNS</span>
                    {inlineResult.domainTechnical.ipv4Count > 0
                      ? `${inlineResult.domainTechnical.ipv4Count} IPv4 záznamov`
                      : "IPv4 záznam sa nenašiel"}
                  </p>
                  <p>
                    <span className="block text-slate-400">
                      E-mailová doména
                    </span>
                    {inlineResult.domainTechnical.mxConfigured === true
                      ? "MX záznam je nastavený"
                      : inlineResult.domainTechnical.mxConfigured === false
                        ? "MX záznam sa nenašiel"
                        : "Nedostupné"}
                  </p>
                  <p>
                    <span className="block text-slate-400">TLS certifikát</span>
                    {inlineResult.domainTechnical.tls?.validTo
                      ? `Platný do ${inlineResult.domainTechnical.tls.validTo}`
                      : "Nedostupné"}
                  </p>
                </div>
                <p className="mt-4 text-[11px] leading-5 text-slate-400">
                  Technické signály pomáhajú pri overení domény, ale samy osebe
                  nepotvrdzujú, že stránka je bezpečná.
                </p>
              </div>
            )}
            {analysisSubject === "url" &&
              inlineResult.officialDomainChecks &&
              inlineResult.officialDomainChecks.length > 0 && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Porovnanie s oficiálnou doménou
                  </div>
                  <div className="mt-4 space-y-3">
                    {inlineResult.officialDomainChecks.map((check) => (
                      <div
                        key={`${check.brand}-${check.hostname}`}
                        className={`rounded-xl px-4 py-3 text-sm ${check.status === "official" ? "bg-emerald-50 text-emerald-950" : "bg-[#fff3ed] text-[#7f3423]"}`}
                      >
                        <p className="font-extrabold">
                          {check.status === "official"
                            ? `${check.brand}: doména sa zhoduje s evidovanou oficiálnou doménou.`
                            : `${check.brand}: názov na stránke sa nezhoduje s oficiálnou doménou.`}
                        </p>
                        <p className="mt-1 text-xs leading-5 opacity-80">
                          Kontrolovaná:{" "}
                          <span className="font-mono font-bold">
                            {check.hostname}
                          </span>{" "}
                          · Evidované oficiálne domény:{" "}
                          {check.officialDomains.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            {inlineResult.phone && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  <Phone className="h-4 w-4 text-[#2563EB]" /> Telefónne číslo
                </div>
                <p className="mt-2 text-xl font-extrabold text-[#020617]">
                  {inlineResult.companyName || "Názov firmy sa nepotvrdil"}
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-600">
                  {inlineResult.formattedPhone || inlineResult.phone}
                </p>
                {inlineResult.businessAddress && (
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {inlineResult.businessAddress}
                  </p>
                )}
                {inlineResult.identitySource && (
                  <p className="mt-2 text-[11px] font-medium text-slate-400">
                    Zdroj identity: {inlineResult.identitySource}
                  </p>
                )}
                {inlineResult.businessMapsUrl && (
                  <a
                    href={inlineResult.businessMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-bold text-[#2563EB] hover:underline"
                  >
                    Otvoriť profil firmy v Mapách
                  </a>
                )}
                {(inlineResult.countryCode ||
                  inlineResult.carrier ||
                  inlineResult.lineType) && (
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {[
                      inlineResult.countryCode,
                      inlineResult.carrier,
                      inlineResult.lineType,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {!inlineResult.lookupAvailable && (
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    Databáza verejných identít zatiaľ nie je pripojená, preto
                    meno firmy nebolo možné vyhľadať.
                  </p>
                )}
                {inlineResult.reputationStatus === "unknown" && (
                  <p className="mt-3 text-xs font-bold text-amber-700">
                    Reputácia čísla nie je overená — tento výsledok neznamená,
                    že je číslo bezpečné.
                  </p>
                )}
                {inlineResult.reputationStatus === "dangerous" && (
                  <p className="mt-3 text-xs font-extrabold text-red-700">
                    Reputačná databáza označila číslo ako nebezpečné
                    {inlineResult.reputationReports
                      ? ` (${inlineResult.reputationReports} hlásení)`
                      : ""}
                    .
                  </p>
                )}
                {inlineResult.reputationSource && (
                  <p className="mt-2 text-[11px] font-medium text-slate-400">
                    Zdroj reputácie: {inlineResult.reputationSource}
                    {inlineResult.reputationScore !== null &&
                    inlineResult.reputationScore !== undefined
                      ? ` · skóre ${inlineResult.reputationScore}`
                      : ""}
                  </p>
                )}
                {inlineResult.trustStepReports ? (
                  <p className="mt-2 text-xs font-bold text-amber-700">
                    Komunita FeelsOdd: {inlineResult.trustStepReports}{" "}
                    {inlineResult.trustStepReports === 1
                      ? "hlásenie"
                      : "hlásení"}{" "}
                    pri tomto čísle.
                  </p>
                ) : null}
                {inlineResult.manualLookupUrl && (
                  <a
                    href={inlineResult.manualLookupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#020617] transition hover:border-[#2563EB] hover:text-[#2563EB]"
                  >
                    Overiť vo vyhladavaniecisla.sk
                  </a>
                )}
                {isLoggedIn && phoneReportState !== "done" && (
                  <button
                    type="button"
                    onClick={reportPhoneNumber}
                    disabled={phoneReportState === "saving"}
                    className="mt-4 block text-xs font-bold text-[#2563EB] hover:underline disabled:opacity-50"
                  >
                    {phoneReportState === "saving"
                      ? "Ukladám hlásenie…"
                      : "Nahlásiť číslo ako podozrivé"}
                  </button>
                )}
                {phoneReportState === "done" && (
                  <p className="mt-4 text-xs font-bold text-emerald-700">
                    Ďakujeme. Vaše hlásenie sa započítalo do komunitného
                    signálu.
                  </p>
                )}
                {phoneReportState === "error" && (
                  <p className="mt-4 text-xs font-bold text-red-700">
                    Hlásenie sa nepodarilo uložiť. Skúste to znova.
                  </p>
                )}
              </div>
            )}
            <AnalysisInsights
              riskLevel={inlineResult.riskLevel}
              reasons={inlineResult.reasons}
              recommendation={
                inlineResult.recommendation ||
                fallbackRecommendation(inlineResult.riskLevel)
              }
              hostname={inlineResult.hostname}
              title={inlineResult.title}
              subject={analysisSubject === "url" ? "url" : "content"}
              contentText={
                analysisSubject === "url"
                  ? url
                  : analysisSubject === "phone"
                    ? `${phone}\n${phoneContext}`
                    : text
              }
              knownDetails={knownDetails}
            />

            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#2563EB] hover:underline"
              >
                Zobraziť celú históriu správ <Send className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="text-lg font-extrabold text-[#020617]">
                  Chcete pokračovať v overovaní?
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Vytvorte si bezplatný účet a získajte prístup k ďalším
                  analýzam.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/register?next=%2Fdashboard%3Fwelcome%3D1"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#020617] px-6 text-xs font-extrabold text-white shadow-sm"
                  >
                    Vytvoriť bezplatný účet
                  </Link>
                  <Link
                    href="/login?next=%2Fsubmit"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-xs font-bold text-[#020617]"
                  >
                    Už mám účet
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectedFile({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs font-bold text-[#020617]">
          {file.name}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
          {Math.max(1, Math.round(file.size / 1024))} kB
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-red-600"
        aria-label="Odstrániť súbor"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function UploadField({
  refObject,
  accept,
  file,
  label,
  note,
  onSelect,
  onRemove,
  children,
}: {
  refObject: React.RefObject<HTMLInputElement>;
  accept: string;
  file: File | null;
  label: string;
  note: string;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <input
        ref={refObject}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      />
      {file ? (
        <SelectedFile file={file} onRemove={onRemove} />
      ) : (
        <button
          type="button"
          onClick={() => refObject.current?.click()}
          className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center transition hover:border-slate-300 hover:bg-slate-100/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm transition">
            <FileUp className="h-6 w-6" />
          </div>
          <span className="mt-3 block font-extrabold text-[#020617]">
            {label}
          </span>
          <span className="mt-1 block text-xs font-semibold text-slate-400">
            {note}
          </span>
        </button>
      )}
      {children}
    </div>
  );
}
