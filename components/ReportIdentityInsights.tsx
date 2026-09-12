"use client";

import { useEffect, useState } from "react";
import { AnalysisInsights } from "@/components/AnalysisInsights";
import { getAppAuthHeaders } from "@/lib/app-auth";
import type { IdentityVerificationStatus, RiskLevel, TrustedIdentity, VerificationResult } from "@/lib/types";

export function ReportIdentityInsights({
  requestId,
  riskLevel,
  reasons,
  recommendation,
  contentText,
  hostname,
  title,
  subject,
  trustedIdentityId,
  identityStatus,
  identityComparison,
}: {
  requestId: string;
  riskLevel: RiskLevel;
  reasons: string[];
  recommendation: string;
  contentText: string;
  hostname?: string;
  title?: string;
  subject?: "url" | "content";
  trustedIdentityId?: string | null;
  identityStatus?: IdentityVerificationStatus | null;
  identityComparison?: Pick<VerificationResult, "messageDetails" | "trustedDetails" | "comparisonSummary" | "detailComparisons"> | null;
}) {
  const [knownDetails, setKnownDetails] = useState("");

  useEffect(() => {
    const sessionDetails = window.sessionStorage.getItem(`truststep_known_details_${requestId}`) ?? "";
    if (sessionDetails || !trustedIdentityId) {
      setKnownDetails(sessionDetails);
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/trusted-identities", { headers: await getAppAuthHeaders() });
        if (!response.ok) return;
        const payload = await response.json() as { identities?: TrustedIdentity[] };
        const trusted = payload.identities?.find((identity) => identity.id === trustedIdentityId);
        if (trusted) setKnownDetails([trusted.email, trusted.phone, trusted.domain, trusted.iban].filter(Boolean).join("\n"));
      } catch {
        // The persisted status is still shown if the contact directory cannot be loaded.
      }
    })();
  }, [requestId, trustedIdentityId]);

  return (
    <AnalysisInsights
      riskLevel={riskLevel}
      reasons={reasons}
      recommendation={recommendation}
      contentText={contentText}
      knownDetails={knownDetails}
      identityStatus={identityStatus ?? undefined}
      persistedComparison={identityComparison}
      hostname={hostname}
      title={title}
      subject={subject}
    />
  );
}
