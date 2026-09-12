"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Loader2, Plus, Trash2, UserRound, X } from "lucide-react";
import { getAppAuthHeaders, getCurrentAppUser } from "@/lib/app-auth";
import type { TrustedIdentity } from "@/lib/types";
import { maskContactDetail } from "@/lib/identity-verification";

type Draft = { label: string; email: string; phone: string; domain: string; iban: string };
const emptyDraft: Draft = { label: "", email: "", phone: "", domain: "", iban: "" };
type ChangeRequest = { id: string; proposed_identity: Draft; requested_by: string; requested_email: string; created_at: string };

function masked(identity: TrustedIdentity) {
  return [
    identity.email && maskContactDetail({ kind: "email", value: identity.email }),
    identity.phone && maskContactDetail({ kind: "phone", value: identity.phone }),
    identity.domain && maskContactDetail({ kind: "domain", value: identity.domain }),
    identity.iban && maskContactDetail({ kind: "iban", value: identity.iban }),
  ].filter(Boolean);
}

export default function TrustedIdentitiesPage() {
  const [identities, setIdentities] = useState<TrustedIdentity[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [changes, setChanges] = useState<ChangeRequest[]>([]);

  async function load() {
    const response = await fetch("/api/trusted-identities", { headers: await getAppAuthHeaders() });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Kontakty sa nepodarilo načítať.");
    setIdentities(payload.identities ?? []);
    const changesResponse = await fetch("/api/trusted-identities/change-requests", { headers: await getAppAuthHeaders() });
    if (changesResponse.ok) {
      const changesPayload = await changesResponse.json() as { changes?: ChangeRequest[] };
      setChanges(changesPayload.changes ?? []);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        if (!(await getCurrentAppUser())) return;
        await load();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Kontakty sa nepodarilo načítať.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/trusted-identities", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAppAuthHeaders()) },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Kontakt sa nepodarilo uložiť.");
      if (payload.approvalRequired) setNotice("Zmena čaká na potvrdenie druhým členom tímu. Dovtedy sa nebude používať pri overovaní.");
      else setIdentities((current) => [payload.identity as TrustedIdentity, ...current]);
      setDraft(emptyDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kontakt sa nepodarilo uložiť.");
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/trusted-identities?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: await getAppAuthHeaders() });
      if (!response.ok) throw new Error("Kontakt sa nepodarilo odstrániť.");
      setIdentities((current) => current.filter((identity) => identity.id !== id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kontakt sa nepodarilo odstrániť."); }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/trusted-identities/change-requests", { method: "PATCH", headers: { "Content-Type": "application/json", ...(await getAppAuthHeaders()) }, body: JSON.stringify({ id, decision }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Rozhodnutie sa nepodarilo uložiť.");
      setChanges((current) => current.filter((change) => change.id !== id));
      setNotice(decision === "approve" ? "Kontakt bol schválený a je pripravený na automatické porovnanie." : "Návrh zmeny bol zamietnutý.");
      if (decision === "approve") await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Rozhodnutie sa nepodarilo uložiť."); }
  }

  return <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
    <header className="border-b border-slate-300 pb-7">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2563EB]">Adresár identity</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-.055em] text-[#020617] sm:text-5xl">Dôveryhodné kontakty</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Uložte údaje, ktoré ste už overili mimo novej komunikácie. FEELSODD ich použije iba na porovnanie pri ďalšej kontrole.</p>
    </header>

    {notice && <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{notice}</p>}

    {changes.length > 0 && <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-[#020617]">Čaká na druhé potvrdenie</h2>
      <p className="mt-1 text-sm text-slate-600">Nový kontakt sa nepoužije pri overovaní, kým ho neschváli iný člen tímu.</p>
      <div className="mt-4 divide-y divide-amber-200 border-y border-amber-200">
        {changes.map((change) => <div key={change.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#020617]">{change.proposed_identity.label}</p><p className="mt-1 text-xs text-slate-500">Navrhol(a) {change.requested_email} · {masked(change.proposed_identity as TrustedIdentity).join(" · ")}</p></div><div className="flex gap-2"><button type="button" onClick={() => void decide(change.id, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-[#020617] px-3 py-2 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" />Schváliť</button><button type="button" onClick={() => void decide(change.id, "reject")} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><X className="h-3.5 w-3.5" />Zamietnuť</button></div></div>)}
      </div>
    </section>}

    <form onSubmit={save} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,.05)] sm:p-8">
      <h2 className="text-lg font-semibold">Pridať dôveryhodnú identitu</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {([ ["label", "Meno osoby alebo firmy", "Napr. ACME účtovníctvo"], ["email", "Overený e-mail", "faktury@acme.sk"], ["phone", "Overené číslo", "+421 900 000 000"], ["domain", "Oficiálna doména", "acme.sk"], ["iban", "Overený IBAN", "SK00 0000 0000 0000 0000 0000"] ] as Array<[keyof Draft, string, string]>).map(([key, label, placeholder]) => <label key={key} className={key === "label" ? "sm:col-span-2" : ""}>
          <span className="text-xs font-semibold text-slate-700">{label}{key === "label" && " *"}</span>
          <input value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} required={key === "label"} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white" />
        </label>)}
      </div>
      {error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}
      <button disabled={saving} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "Ukladám…" : "Uložiť kontakt"}</button>
    </form>

    <section className="mt-10 border-y border-slate-200">
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" /></div> : identities.length ? identities.map((identity) => <div key={identity.id} className="flex items-center justify-between gap-4 border-b border-slate-200 py-5 last:border-b-0">
        <div className="min-w-0"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" /><h2 className="font-semibold text-[#020617]">{identity.label}</h2></div><p className="mt-2 truncate font-mono text-xs text-slate-500">{masked(identity).join(" · ")}</p></div>
        <button type="button" onClick={() => void remove(identity.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Odstrániť ${identity.label}`}><Trash2 className="h-4 w-4" /></button>
      </div>) : <p className="py-12 text-center text-sm text-slate-500">Zatiaľ nemáte uložené žiadne dôveryhodné kontakty.</p>}
    </section>
  </div>;
}
