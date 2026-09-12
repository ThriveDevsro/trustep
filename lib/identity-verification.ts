import type { AnalysisResult, IdentityVerificationStatus, VerificationResult } from "./types";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const IBAN = /\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]){10,30}\b/gi;
const DOMAIN = /\b(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z]{2,})(?:\/[^\s]*)?/gi;

export type ContactDetail = { kind: "email" | "phone" | "iban" | "domain"; value: string };

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function maskContactDetail(detail: ContactDetail): string {
  const value = detail.value.trim();
  if (detail.kind === "email") {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
  }
  if (detail.kind === "domain") return value.replace(/^(.{2}).*(\.[^.]+)$/, "$1••••$2");
  if (detail.kind === "iban") return `${value.slice(0, 4)} •••• •••• ${value.replace(/\s/g, "").slice(-4)}`;
  return `${value.slice(0, 4)} ••• ••• ${value.replace(/\D/g, "").slice(-3)}`;
}

export function extractContactDetails(text: string): ContactDetail[] {
  const found: ContactDetail[] = [];
  const add = (kind: ContactDetail["kind"], value: string) => {
    const clean = value.trim().replace(/[.,;:]+$/, "");
    if (clean.length < 5 || found.some((item) => item.kind === kind && normalized(item.value) === normalized(clean))) return;
    found.push({ kind, value: clean });
  };
  for (const value of text.match(EMAIL) ?? []) add("email", value);
  for (const value of text.match(IBAN) ?? []) add("iban", value);
  for (const value of text.match(PHONE) ?? []) add("phone", value);
  for (const match of Array.from(text.matchAll(DOMAIN))) {
    const domain = match[1];
    if (domain && !domain.includes("@")) add("domain", domain);
  }
  return found.slice(0, 6);
}

function structuredReason(reasons: string[], prefix: string, fallback: string) {
  return reasons.find((reason) => reason.startsWith(prefix))?.slice(prefix.length).trim() || fallback;
}

export function getIdentityVerification(
  analysis: AnalysisResult,
  text: string,
  knownDetails = "",
): VerificationResult {
  const claimedIdentity = structuredReason(
    analysis.reasons,
    "[IDENTITY] ",
    "Odosielateľova deklarovaná identita sa zo zadaných údajov nedá určiť.",
  );
  const requestedAction = structuredReason(
    analysis.reasons,
    "[REQUEST] ",
    "Požiadavku sa zo zadaných údajov nedá určiť.",
  );
  const messageDetails = extractContactDetails(text);
  const trustedDetails = extractContactDetails(knownDetails);
  const sensitiveAction = /plat|iban|účet|prevod|heslo|kód|prihlás|citliv|údaj/i.test(`${text} ${requestedAction}`);
  const changedLanguage = /nov[ýáé]|zmen[aei]|aktualizovan|iné číslo|new (?:number|iban|account)|updated/i.test(text);
  const hasMatch = trustedDetails.some((trusted) =>
    messageDetails.some(
      (detail) => detail.kind === trusted.kind && normalized(detail.value) === normalized(trusted.value),
    ),
  );
  const hasMismatch = trustedDetails.some((trusted) => {
    const sameKindInMessage = messageDetails.filter((detail) => detail.kind === trusted.kind);
    return sameKindInMessage.length > 0 && !sameKindInMessage.some((detail) => normalized(detail.value) === normalized(trusted.value));
  });
  const detailComparisons = trustedDetails.flatMap((trusted) => {
    const observed = messageDetails.find((detail) => detail.kind === trusted.kind);
    if (!observed) return [];
    return [{
      kind: trusted.kind,
      trustedValue: maskContactDetail(trusted),
      observedValue: maskContactDetail(observed),
      status: normalized(trusted.value) === normalized(observed.value) ? "match" as const : "changed" as const,
    }];
  });

  let status: IdentityVerificationStatus = "IDENTITY_NOT_VERIFIED";
  if (hasMismatch && sensitiveAction) status = "STOP_AND_VERIFY";
  else if (hasMismatch || changedLanguage) status = "DETAILS_CHANGED";
  else if (hasMatch) status = "VERIFIED";
  else if (analysis.riskLevel === "high" && sensitiveAction) status = "STOP_AND_VERIFY";

  const verificationMethod = status === "VERIFIED"
    ? "Údaj v komunikácii sa zhoduje s údajom, ktorý ste zadali ako dôveryhodný. Pri platbe si aj tak potvrďte samotnú požiadavku cez existujúci kontakt."
    : "Nepoužite kontakt ani odkaz z tejto komunikácie. Zavolajte na číslo uložené v kontaktoch, alebo otvorte oficiálnu aplikáciu či stránku, ktorú si nájdete samostatne.";

  return {
    status,
    claimedIdentity,
    requestedAction,
    messageDetails: messageDetails.map((detail) => ({ ...detail, value: maskContactDetail(detail) })),
    trustedDetails: trustedDetails.map((detail) => ({ ...detail, value: maskContactDetail(detail) })),
    comparisonSummary: hasMismatch
      ? "Údaj rovnakého typu v komunikácii sa nezhoduje s vaším uloženým dôveryhodným údajom."
      : hasMatch
        ? "Nájdený údaj sa zhoduje s vaším uloženým dôveryhodným údajom."
        : trustedDetails.length > 0
          ? "V komunikácii sa nenašiel údaj, ktorý by sa dal porovnať s uloženým kontaktom."
          : "Na porovnanie nebol zvolený žiadny dôveryhodný kontakt.",
    detailComparisons,
    safeActions: trustedDetails
      .filter((detail): detail is ContactDetail & { kind: "email" | "phone" | "domain" } => detail.kind !== "iban")
      .map((detail) => ({ kind: detail.kind, value: detail.value })),
    verificationMethod,
  };
}
