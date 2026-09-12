import { NextRequest, NextResponse } from "next/server";
import { resolveAnalysisAccess } from "@/lib/analysis-access";
import { createServiceClient } from "@/lib/supabase";
import { getIdentityVerification } from "@/lib/identity-verification";
import { listDevTrustedIdentities } from "@/lib/dev-trusted-identities-store";
import { getDevRequestById, updateDevRequestVerification } from "@/lib/dev-requests-store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveAnalysisAccess(req, undefined, { enforceLimit: false });
  if (access.response || !access.access || access.access.isGuest) return access.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { trustedIdentityId } = await req.json() as { trustedIdentityId?: string };
  if (!trustedIdentityId) return NextResponse.json({ error: "Vyberte dôveryhodný kontakt." }, { status: 400 });
  const companyId = access.access.companyId;
  const supabase = createServiceClient();

  if (!supabase) {
    const [request, identities] = await Promise.all([getDevRequestById(params.id), listDevTrustedIdentities(companyId)]);
    const trusted = identities.find((identity) => identity.id === trustedIdentityId);
    if (!request || request.company_id !== companyId || !trusted) return NextResponse.json({ error: "Kontakt alebo overenie sa nenašli." }, { status: 404 });
    const knownDetails = [trusted.email, trusted.phone, trusted.domain, trusted.iban].filter(Boolean).join("\n");
    const verification = getIdentityVerification({ riskLevel: request.risk_level, reasons: request.reasons, recommendation: request.recommendation }, request.text, knownDetails);
    const identityComparison = { status: verification.status, messageDetails: verification.messageDetails, trustedDetails: verification.trustedDetails, comparisonSummary: verification.comparisonSummary, detailComparisons: verification.detailComparisons };
    await updateDevRequestVerification(companyId, params.id, { trusted_identity_id: trusted.id, identity_status: verification.status, identity_comparison: identityComparison });
    return NextResponse.json({ status: verification.status, comparison: identityComparison });
  }

  const [{ data: request }, { data: trusted }] = await Promise.all([
    supabase.from("requests").select("id, company_id, text, risk_level, reasons, recommendation").eq("id", params.id).eq("company_id", companyId).maybeSingle(),
    supabase.from("trusted_identities").select("id, email, phone, domain, iban").eq("id", trustedIdentityId).eq("company_id", companyId).maybeSingle(),
  ]);
  if (!request || !trusted) return NextResponse.json({ error: "Kontakt alebo overenie sa nenašli." }, { status: 404 });
  const knownDetails = [trusted.email, trusted.phone, trusted.domain, trusted.iban].filter(Boolean).join("\n");
  const verification = getIdentityVerification({ riskLevel: request.risk_level, reasons: request.reasons ?? [], recommendation: request.recommendation ?? "" }, request.text, knownDetails);
  const identityComparison = { status: verification.status, messageDetails: verification.messageDetails, trustedDetails: verification.trustedDetails, comparisonSummary: verification.comparisonSummary, detailComparisons: verification.detailComparisons };
  const { error } = await supabase.from("requests").update({ trusted_identity_id: trusted.id, identity_status: verification.status, identity_comparison: identityComparison }).eq("id", request.id).eq("company_id", companyId);
  if (error) return NextResponse.json({ error: "Výsledok porovnania sa nepodarilo uložiť." }, { status: 500 });
  return NextResponse.json({ status: verification.status, comparison: identityComparison });
}
