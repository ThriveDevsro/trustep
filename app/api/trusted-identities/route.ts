import { NextRequest, NextResponse } from "next/server";
import { resolveAnalysisAccess } from "@/lib/analysis-access";
import { createServiceClient } from "@/lib/supabase";
import { getRequestAppUser } from "@/lib/server-auth";
import {
  createDevTrustedIdentity,
  deleteDevTrustedIdentity,
  listDevTrustedIdentities,
} from "@/lib/dev-trusted-identities-store";

const MAX_LENGTH = 180;
const fields = ["email", "phone", "domain", "iban"] as const;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_LENGTH) : "";
}

async function access(req: NextRequest) {
  const result = await resolveAnalysisAccess(req, undefined, { enforceLimit: false });
  if (result.response || !result.access || result.access.isGuest) return { response: result.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { companyId: result.access.companyId };
}

export async function GET(req: NextRequest) {
  const result = await access(req);
  if (result.response) return result.response;
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ identities: await listDevTrustedIdentities(result.companyId!) });
  const { data, error } = await supabase.from("trusted_identities").select("id, company_id, label, email, phone, domain, iban, created_at").eq("company_id", result.companyId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Dôveryhodné kontakty sa nepodarilo načítať." }, { status: 500 });
  return NextResponse.json({ identities: data ?? [] });
}

export async function POST(req: NextRequest) {
  const result = await access(req);
  if (result.response) return result.response;
  const body = await req.json();
  const label = clean(body.label);
  const details = Object.fromEntries(fields.map((field) => [field, clean(body[field]) || null]));
  if (!label || !fields.some((field) => details[field])) return NextResponse.json({ error: "Zadajte názov a aspoň jeden dôveryhodný údaj." }, { status: 400 });
  const input = { company_id: result.companyId!, label, ...details };
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ identity: await createDevTrustedIdentity(input) }, { status: 201 });
  const user = await getRequestAppUser(req);
  const [{ data: company }, { count: teammateCount }] = await Promise.all([
    supabase.from("companies").select("account_type").eq("id", result.companyId).maybeSingle(),
    supabase.from("company_members").select("id", { count: "exact", head: true }).eq("company_id", result.companyId).eq("status", "active").neq("user_id", user?.id ?? ""),
  ]);
  if (company?.account_type === "business" && (teammateCount ?? 0) > 0 && user) {
    const { data: changeRequest, error: approvalError } = await supabase
      .from("trusted_identity_change_requests")
      .insert({ company_id: result.companyId, action: "create", proposed_identity: { label, ...details }, requested_by: user.id, requested_email: user.email })
      .select("id, status, created_at")
      .single();
    if (approvalError) return NextResponse.json({ error: "Zmenu sa nepodarilo odoslať na schválenie." }, { status: 500 });
    return NextResponse.json({ approvalRequired: true, changeRequest }, { status: 202 });
  }
  const { data, error } = await supabase.from("trusted_identities").insert(input).select("id, company_id, label, email, phone, domain, iban, created_at").single();
  if (error) return NextResponse.json({ error: "Kontakt sa nepodarilo uložiť." }, { status: 500 });
  return NextResponse.json({ identity: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await access(req);
  if (result.response) return result.response;
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Chýba identifikátor kontaktu." }, { status: 400 });
  const supabase = createServiceClient();
  if (!supabase) {
    const deleted = await deleteDevTrustedIdentity(result.companyId!, id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Kontakt sa nenašiel." }, { status: 404 });
  }
  const { error } = await supabase.from("trusted_identities").delete().eq("id", id).eq("company_id", result.companyId);
  if (error) return NextResponse.json({ error: "Kontakt sa nepodarilo odstrániť." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
