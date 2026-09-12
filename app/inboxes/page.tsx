'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Mail,
  Pause,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { getAppAuthHeaders, getCurrentAppUser } from '@/lib/app-auth'
import { getInboxProviderMeta, getInboxStatusClasses, getInboxStatusLabel } from '@/lib/mailboxes'
import { getSupabase } from '@/lib/supabase'
import type { ConnectedInbox, InboxProvider } from '@/lib/types'

type InboxForm = {
  provider: InboxProvider
  emailAddress: string
  displayName: string
  imapHost: string
  imapPort: string
  imapUsername: string
  imapPassword: string
}

const EMPTY_FORM: InboxForm = {
  provider: 'gmail',
  emailAddress: '',
  displayName: '',
  imapHost: '',
  imapPort: '993',
  imapUsername: '',
  imapPassword: '',
}

const PROVIDERS: Array<{ id: InboxProvider; title: string; note: string }> = [
  { id: 'gmail', title: 'Gmail', note: 'Google alebo Google Workspace' },
  { id: 'outlook', title: 'Outlook', note: 'Microsoft 365 alebo Outlook.com' },
  { id: 'imap', title: 'Iný e-mail', note: 'Firemná schránka cez IMAP' },
]

function oauthEndpoint(inbox: ConnectedInbox) {
  return inbox.provider === 'gmail'
    ? '/api/inboxes/oauth/google/start'
    : '/api/inboxes/oauth/outlook/start'
}

export default function InboxesPage() {
  const router = useRouter()
  const hasSupabase = Boolean(getSupabase())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [syncingId, setSyncingId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [inboxes, setInboxes] = useState<ConnectedInbox[]>([])
  const [form, setForm] = useState<InboxForm>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function reload(targetCompanyId: string) {
    const response = await fetch(`/api/inboxes?companyId=${encodeURIComponent(targetCompanyId)}`, { headers: await getAppAuthHeaders() })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Schránky sa nepodarilo načítať.')
    setInboxes(payload.inboxes ?? [])
  }

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentAppUser()
        if (!user) {
          router.replace('/login')
          return
        }

        setCompanyId(user.id)
        await reload(user.id)

        const params = new URLSearchParams(window.location.search)
        if (params.get('oauth') === 'connected') {
          setSuccess('Schránka bola úspešne pripojená.')
        } else if (params.get('oauth_error')) {
          setError('Prepojenie sa nepodarilo dokončiť. Skontrolujte nastavenie poskytovateľa a skúste to znova.')
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Schránky sa nepodarilo načítať.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/inboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
        body: JSON.stringify({
          companyId,
          provider: form.provider,
          emailAddress: form.emailAddress,
          displayName: form.displayName,
          scanMode: 'auto',
          imapHost: form.provider === 'imap' ? form.imapHost : '',
          imapPort: form.provider === 'imap' ? form.imapPort : '',
          imapSecure: true,
          imapUsername: form.provider === 'imap' ? form.imapUsername : '',
          imapPassword: form.provider === 'imap' ? form.imapPassword : '',
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Schránku sa nepodarilo pridať.')

      const createdInbox = payload.inbox as ConnectedInbox | undefined
      if (hasSupabase && createdInbox && (createdInbox.provider === 'gmail' || createdInbox.provider === 'outlook')) {
        await startOauth(createdInbox)
        return
      }

      setForm(EMPTY_FORM)
      setSuccess(hasSupabase ? 'Schránka je pripojená.' : 'Demo schránka je pripravená. Môžete spustiť kontrolu.')
      await reload(companyId)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Schránku sa nepodarilo pridať.')
    } finally {
      setSaving(false)
    }
  }

  async function startOauth(inbox: ConnectedInbox) {
    const response = await fetch(oauthEndpoint(inbox), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
      body: JSON.stringify({ inboxId: inbox.id }),
    })
    const payload = await response.json()
    if (!response.ok || !payload.authorizeUrl) throw new Error(payload.error || 'Prepojenie sa nepodarilo spustiť.')
    window.location.assign(payload.authorizeUrl)
  }

  async function handleStatus(inbox: ConnectedInbox) {
    setBusyId(inbox.id)
    setError('')
    try {
      const response = await fetch(`/api/inboxes/${inbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
        body: JSON.stringify({ status: inbox.status === 'paused' ? 'connected' : 'paused' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Stav sa nepodarilo zmeniť.')
      await reload(companyId)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Stav sa nepodarilo zmeniť.')
    } finally {
      setBusyId('')
    }
  }

  async function handleSync(inbox: ConnectedInbox) {
    setSyncingId(inbox.id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/inboxes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
        body: JSON.stringify({ companyId, inboxId: inbox.id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Kontrola schránky zlyhala.')
      const created = payload.summary?.created ?? 0
      setSuccess(created > 0 ? `Hotovo. Pribudlo ${created} nových analýz.` : 'Hotovo. Nenašli sa žiadne nové správy.')
      await reload(companyId)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Kontrola schránky zlyhala.')
    } finally {
      setSyncingId('')
    }
  }

  async function handleAutopilot(inbox: ConnectedInbox) {
    setBusyId(inbox.id)
    setError('')
    try {
      const response = await fetch(`/api/inboxes/${inbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAppAuthHeaders()) },
        body: JSON.stringify({ scanMode: inbox.scan_mode === 'auto' ? 'manual' : 'auto' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Nastavenie ochrany sa nepodarilo zmeniť.')
      setSuccess(inbox.scan_mode === 'auto' ? 'Autopilot je pre túto schránku pozastavený.' : 'Autopilot je zapnutý. Nové správy sa budú kontrolovať automaticky.')
      await reload(companyId)
    } catch (autopilotError) {
      setError(autopilotError instanceof Error ? autopilotError.message : 'Nastavenie ochrany sa nepodarilo zmeniť.')
    } finally {
      setBusyId('')
    }
  }

  async function handleDelete(inbox: ConnectedInbox) {
    if (!window.confirm(`Odpojiť schránku ${inbox.email_address}?`)) return
    setBusyId(inbox.id)
    setError('')
    try {
      const response = await fetch(`/api/inboxes/${inbox.id}`, { method: 'DELETE', headers: await getAppAuthHeaders() })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Schránku sa nepodarilo odpojiť.')
      await reload(companyId)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Schránku sa nepodarilo odpojiť.')
    } finally {
      setBusyId('')
    }
  }

  if (loading) {
    return <div className="flex min-h-[calc(100vh-72px)] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div>
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/ucet" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#020617]">
        <ArrowLeft className="h-4 w-4" /> Späť na účet
      </Link>

      <header className="mt-7 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#020617] sm:text-5xl">E-mailová ochrana</h1>
        <p className="mt-4 text-base leading-7 text-slate-500">Pripojte pracovnú schránku raz. FeelsOdd potom kontroluje nové správy bez preposielania a zastaví podozrivé platby či prihlásenia skôr, než niekto zareaguje.</p>
      </header>

      {(error || success) && (
        <div className={`mt-7 rounded-2xl px-5 py-4 text-sm font-bold ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      <section className="mt-8 overflow-hidden rounded-[28px] bg-[#020617] text-white shadow-[0_18px_60px_rgba(11,40,84,0.12)]">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-emerald-300"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-extrabold uppercase tracking-[0.16em]">Autopilot ochrana</span></div>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em]">Pripojte raz. Chránime každú ďalšiu správu</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Kontrolujeme nové e-maily automaticky. Pri riziku pripravíme incident a jasný postup — bez toho, aby musel ktokoľvek hľadať signály podvodu.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-bold text-emerald-100">{inboxes.filter((inbox) => inbox.status === 'connected' && inbox.scan_mode === 'auto').length} schránok chránených automaticky</div>
        </div>
        <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
          <div className="bg-[#020617] px-6 py-4"><p className="text-sm font-bold">Phishing a falošné prihlásenie</p><p className="mt-1 text-xs leading-5 text-slate-300">Zachytí podozrivé domény, odkazy a žiadosti o heslo či kód.</p></div>
          <div className="bg-[#020617] px-6 py-4"><p className="text-sm font-bold">Faktúra alebo nový IBAN</p><p className="mt-1 text-xs leading-5 text-slate-300">Zastaví rizikovú platbu a dá postup overenia cez nezávislý kontakt.</p></div>
          <div className="bg-[#020617] px-6 py-4"><p className="text-sm font-bold">Jeden prehľad incidentov</p><p className="mt-1 text-xs leading-5 text-slate-300">Dôležité prípady dostane správny človek, nie celá firma.</p></div>
        </div>
      </section>

      {inboxes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-400">Pripojené schránky</h2>
          <div className="overflow-hidden rounded-[26px] bg-white shadow-[0_18px_60px_rgba(11,40,84,0.07)]">
            {inboxes.map((inbox, index) => {
              const provider = getInboxProviderMeta(inbox.provider)
              const busy = busyId === inbox.id
              const syncing = syncingId === inbox.id
              return (
                <div key={inbox.id} className={`p-5 sm:p-7 ${index > 0 ? 'border-t border-slate-100' : ''}`}>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff0e9] text-[#2563EB]">
                        {inbox.provider === 'imap' ? <Server className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-extrabold text-[#020617]">{inbox.display_name || inbox.email_address}</p>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getInboxStatusClasses(inbox.status)}`}>
                            {getInboxStatusLabel(inbox.status)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">{inbox.email_address} · {provider.label}</p>
                        <p className={`mt-2 text-xs font-bold ${inbox.scan_mode === 'auto' ? 'text-emerald-700' : 'text-slate-400'}`}>{inbox.scan_mode === 'auto' ? 'Autopilot aktívny · nové správy sa kontrolujú automaticky' : 'Len manuálna kontrola'}</p>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                      {(inbox.provider === 'gmail' || inbox.provider === 'outlook') && hasSupabase && inbox.status !== 'connected' && (
                        <button type="button" onClick={() => startOauth(inbox).catch((oauthError) => setError(oauthError instanceof Error ? oauthError.message : 'Prepojenie sa nepodarilo spustiť.'))} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#020617] px-4 py-2.5 text-center text-xs font-bold text-white sm:flex-none">
                          Dokončiť pripojenie <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {inbox.status === 'connected' && (
                        <button type="button" onClick={() => handleAutopilot(inbox)} disabled={busy} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-center text-xs font-bold sm:flex-none ${inbox.scan_mode === 'auto' ? 'bg-[#dcefe8] text-emerald-800 hover:bg-[#c9e6da]' : 'bg-[#020617] text-white hover:bg-[#12396f]'}`}>
                          <ShieldCheck className="h-3.5 w-3.5" /> {inbox.scan_mode === 'auto' ? 'Vypnúť autopilot' : 'Zapnúť autopilot'}
                        </button>
                      )}
                      {inbox.status === 'connected' && (
                        <button type="button" onClick={() => handleSync(inbox)} disabled={syncing} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-[#020617] hover:bg-slate-50 disabled:opacity-50 sm:flex-none">
                          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Skontrolovať teraz
                        </button>
                      )}
                      <button type="button" onClick={() => handleStatus(inbox)} disabled={busy} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#020617] disabled:opacity-50" aria-label={inbox.status === 'paused' ? 'Obnoviť' : 'Pozastaviť'}>
                        {inbox.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => handleDelete(inbox)} disabled={busy} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label="Odpojiť schránku">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {inbox.status === 'error' && inbox.last_error && <p className="mt-4 text-sm font-semibold text-red-600">{inbox.last_error}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="mt-10 rounded-[28px] bg-[#edece7] p-6 sm:p-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">Nové prepojenie</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#020617]">Zapnúť ochranu schránky</h2></div><div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" /> Prístup môžete kedykoľvek odvolať</div></div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Vyberte poskytovateľa a potvrďte prístup. FeelsOdd číta iba správy potrebné na bezpečnostnú kontrolu; môžete ho kedykoľvek pozastaviť alebo odpojiť.</p>

        <div className="mt-6 grid gap-2 text-xs sm:grid-cols-3"><div className="rounded-xl bg-white/70 px-4 py-3"><b className="text-[#2563EB]">01</b><span className="ml-2 font-bold text-[#020617]">Vyberte schránku</span></div><div className="rounded-xl bg-white/70 px-4 py-3"><b className="text-[#2563EB]">02</b><span className="ml-2 font-bold text-[#020617]">Potvrďte u poskytovateľa</span></div><div className="rounded-xl bg-white/70 px-4 py-3"><b className="text-[#2563EB]">03</b><span className="ml-2 font-bold text-[#020617]">Zapne sa autopilot</span></div></div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => setForm((current) => ({ ...current, provider: provider.id }))}
              className={`rounded-2xl px-4 py-4 text-left transition ${form.provider === provider.id ? 'bg-[#020617] text-white' : 'bg-white/70 text-[#020617] hover:bg-white'}`}
            >
              <span className="block text-sm font-extrabold">{provider.title}</span>
              <span className={`mt-1 block text-xs ${form.provider === provider.id ? 'text-white/60' : 'text-slate-400'}`}>{provider.note}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleCreate} className="mt-7 grid gap-4 sm:grid-cols-2">
          {form.provider !== 'imap' && (
            <div className="rounded-2xl border border-[#020617]/10 bg-white/70 p-5 sm:col-span-2">
              <p className="font-extrabold text-[#020617]">Bez hesla pre FeelsOdd.</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Po potvrdení u {form.provider === 'gmail' ? 'Google' : 'Microsoftu'} zistíme adresu schránky automaticky a rovno zapneme Autopilot ochranu. Prístup udeľujete priamo poskytovateľovi cez OAuth.</p>
            </div>
          )}

          {form.provider === 'imap' && (
            <>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">E-mailová adresa<input required type="email" value={form.emailAddress} onChange={(event) => setForm((current) => ({ ...current, emailAddress: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border-0 bg-white px-4 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#2563EB]" placeholder="meno@firma.sk" /></label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Názov <span className="font-medium normal-case tracking-normal text-slate-400">(voliteľné)</span><input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border-0 bg-white px-4 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#2563EB]" placeholder="Fakturácia" /></label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">IMAP server<input required value={form.imapHost} onChange={(event) => setForm((current) => ({ ...current, imapHost: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border-0 bg-white px-4 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#2563EB]" placeholder="imap.firma.sk" /></label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Port<input required inputMode="numeric" value={form.imapPort} onChange={(event) => setForm((current) => ({ ...current, imapPort: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border-0 bg-white px-4 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#2563EB]" /></label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Používateľ<input required value={form.imapUsername} onChange={(event) => setForm((current) => ({ ...current, imapUsername: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border-0 bg-white px-4 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#2563EB]" /></label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Heslo aplikácie<input required type="password" value={form.imapPassword} onChange={(event) => setForm((current) => ({ ...current, imapPassword: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border-0 bg-white px-4 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#2563EB]" /></label>
            </>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2563EB] px-6 text-sm font-extrabold text-white transition hover:bg-[#e84800] disabled:opacity-60 sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.provider === 'imap' ? 'Pripojiť schránku' : `Pokračovať cez ${form.provider === 'gmail' ? 'Google' : 'Microsoft'}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
