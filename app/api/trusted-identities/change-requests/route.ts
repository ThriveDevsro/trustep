import { NextRequest, NextResponse } from "next/server";
import { resolveAnalysisAccess } from "@/lib/analysis-access";
import { createServiceClient } from "@/lib/supabase";
import { getRequestAppUser } from "@/lib/server-auth";

async function access(req: NextRequest) {
  const result = await resolveAnalysisAccess(req, undefined, { enforceLimit: false });
  if (result.response || !result.access || result.access.isGuest) return { response: result.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await getRequestAppUser(req);
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { companyId: result.access.companyId, user };
}

export async function GET(req: NextRequest) {
  const result = await access(req);
  if (result.response) return result.response;
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ changes: [] });
  const { data, error } = await supabase
    .from("trusted_identity_change_requests")
    .select("id, action, proposed_identity, requested_by, requested_email, status, created_at")
    .eq("company_id", result.companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Čakajúce zmeny sa nepodarilo načítať." }, { status: 500 });
  return NextResponse.json({ changes: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const result = await access(req);
  if (result.response) return result.response;
  const { id, decision } = await req.json() as { id?: string; decision?: "approve" | "reject" };
  if (!id || (decision !== "approve" && decision !== "reject")) return NextResponse.json({ error: "Neplatné rozhodnutie." }, { status: 400 });
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "Schvaľovanie zmien vyžaduje databázu workspace." }, { status: 503 });
  const { data: change } = await supabase
    .from("trusted_identity_change_requests")
    .select("id, action, proposed_identity, requested_by, status")
    .eq("id", id)
    .eq("company_id", result.companyId)
    .maybeSingle();
  if (!change || change.status !== "pending") return NextResponse.json({ error: "Táto zmena už nie je k dispozícii." }, { status: 404 });
  if (change.requested_by === result.user!.id) return NextResponse.json({ error: "Vlastnú zmenu nemôžete schváliť." }, { status: 403 });

  if (decision === "approve") {
    const proposed = change.proposed_identity as { label?: string; email?: string | null; phone?: string | null; domain?: string | null; iban?: string | null };
    if (!proposed.label || ![proposed.email, proposed.phone, proposed.domain, proposed.iban].some(Boolean)) return NextResponse.json({ error: "Návrh zmeny je neplatný." }, { status: 400 });
    const { error: insertError } = await supabase.from("trusted_identities").insert({ company_id: result.companyId, label: proposed.label, email: proposed.email ?? null, phone: proposed.phone ?? null, domain: proposed.domain ?? null, iban: proposed.iban ?? null });
    if (insertError) return NextResponse.json({ error: "Schválený kontakt sa nepodarilo uložiť." }, { status: 500 });
  }
  const { error } = await supabase.from("trusted_identity_change_requests").update({ status: decision === "approve" ? "approved" : "rejected", reviewed_by: result.user!.id, reviewed_at: new Date().toISOString() }).eq("id", change.id);
  if (error) return NextResponse.json({ error: "Rozhodnutie sa nepodarilo uložiť." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
