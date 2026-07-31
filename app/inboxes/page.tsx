'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SourceBadge } from '@/components/SourceBadge'
import { deriveAccountNameFromEmail, getCurrentAppUser } from '@/lib/app-auth'
import { getSupabase } from '@/lib/supabase'
import { getInboxNextStep, getInboxProviderMeta, getInboxStatusClasses, getInboxStatusLabel, INBOX_PROVIDERS } from '@/lib/mailboxes'
import type { AlertDelivery, ConnectedInbox, InboxProvider } from '@/lib/types'
import { BellRing, Inbox, Loader2, Mail, PauseCircle, PlayCircle, RefreshCw, ShieldCheck, Trash2, Waypoints, Link2 } from 'lucide-react'

type CreateInboxForm = {
  provider: InboxProvider
  emailAddress: string
  displayName: string
  scanMode: 'auto' | 'manual' | 'digest'
  imapHost: string
  imapPort: string
  imapSecure: boolean
  imapUsername: string
  imapPassword: string
}

type InboxHealthStats = {
  scanned24h: number
  risky7d: number
  total30d: number
  lastRequestAt: string | null
}

type EditInboxForm = {
  displayName: string
  scanMode: 'auto' | 'manual' | 'digest'
  imapHost: string
  imapPort: string
  imapSecure: boolean
  imapUsername: string
  imapPassword: string
}

const DEFAULT_FORM: CreateInboxForm = {
  provider: 'gmail',
  emailAddress: '',
  displayName: '',
  scanMode: 'auto',
  imapHost: '',
  imapPort: '993',
  imapSecure: true,
  imapUsername: '',
  imapPassword: '',
}

export default function InboxesPage() {
  const router = useRouter()
  const hasSupabase = Boolean(getSupabase())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyInboxId, setBusyInboxId] = useState('')
  const [syncingTarget, setSyncingTarget] = useState('')
  const [editingInboxId, setEditingInboxId] = useState('')
  const [savingSettingsId, setSavingSettingsId] = useState('')
  const [testingAlert, setTestingAlert] = useState(false)
  const [retryingAlertId, setRetryingAlertId] = useState('')
  const [sendingDigest, setSendingDigest] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [accountName, setAccountName] = useState('TrustStep účet')
  const [inboxes, setInboxes] = useState<ConnectedInbox[]>([])
  const [alerts, setAlerts] = useState<AlertDelivery[]>([])
  const [healthStats, setHealthStats] = useState<Record<string, InboxHealthStats>>({})
  const [form, setForm] = useState<CreateInboxForm>(DEFAULT_FORM)
  const [editForm, setEditForm] = useState<EditInboxForm | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthStatus = params.get('oauth')?.trim()
    const oauthProvider = params.get('provider')?.trim()
    const oauthError = params.get('oauth_error')?.trim()

    if (oauthStatus === 'connected') {
      const providerLabel = oauthProvider === 'outlook' ? 'Outlook' : oauthProvider === 'gmail' ? 'Gmail' : 'schránku'
      setSuccess(`OAuth pre ${providerLabel} bol úspešne dokončený.`)
      setError('')
      return
    }

    if (oauthError) {
      const errorMessages: Record<string, string> = {
        missing_inbox: 'Chýba identifikátor inboxu pre OAuth prepojenie.',
        missing_google_config: 'Google OAuth nie je nakonfigurovaný v `.env.local`.',
        missing_microsoft_config: 'Microsoft OAuth nie je nakonfigurovaný v `.env.local`.',
        missing_supabase: 'Supabase nie je nakonfigurovaný.',
        inbox_not_found: 'Inbox pre OAuth prepojenie sa nenašiel.',
        invalid_state: 'OAuth stav je neplatný alebo expiroval.',
        access_denied: 'OAuth prepojenie bolo zamietnuté.',
        callback_failed: 'OAuth callback zlyhal.',
        start_failed: 'Nepodarilo sa spustiť OAuth flow.',
      }

      setError(errorMessages[oauthError] || 'OAuth prepojenie sa nepodarilo dokončiť.')
      setSuccess('')
    }
  }, [])

  useEffect(() => {
    async function loadPage() {
      const user = await getCurrentAppUser()
      if (!user) {
        router.push('/login')
        return
      }

      setCompanyId(user.id)
      setAccountName(deriveAccountNameFromEmail(user.email))

      const supabase = getSupabase()

      if (!supabase) {
        const inboxResponse = await fetch(`/api/inboxes?companyId=${encodeURIComponent(user.id)}`)
        if (inboxResponse.ok) {
          const payload = await inboxResponse.json()
          setInboxes(payload.inboxes ?? [])
          setHealthStats(payload.stats ?? {})
          setAlerts(payload.alerts ?? [])
          setSuccess('Beží demo inbox režim. Sync vytvorí ukážkové e-mailové incidenty bez Supabase integrácií.')
        } else {
          setError('Nepodarilo sa načítať demo inboxy.')
        }
        setLoading(false)
        return
      }

      const [{ data: companyData }, inboxResponse] = await Promise.all([
        supabase.from('companies').select('name').eq('id', user.id).single(),
        fetch(`/api/inboxes?companyId=${encodeURIComponent(user.id)}`),
      ])

      if (companyData?.name) {
        setAccountName(companyData.name)
      }

      if (inboxResponse.ok) {
        const payload = await inboxResponse.json()
        setInboxes(payload.inboxes ?? [])
        setHealthStats(payload.stats ?? {})
        setAlerts(payload.alerts ?? [])
      }

      setLoading(false)
    }

    loadPage()
  }, [router, hasSupabase])

  async function reloadInboxes(targetCompanyId = companyId) {
    if (!targetCompanyId) return

    const response = await fetch(`/api/inboxes?companyId=${encodeURIComponent(targetCompanyId)}`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Nepodarilo sa načítať inboxy.')
    setInboxes(payload.inboxes ?? [])
    setHealthStats(payload.stats ?? {})
    setAlerts(payload.alerts ?? [])
  }

  async function handleCreateInbox(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/inboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          provider: form.provider,
          emailAddress: form.emailAddress,
          displayName: form.displayName,
          scanMode: form.scanMode,
          imapHost: form.provider === 'imap' ? form.imapHost : '',
          imapPort: form.provider === 'imap' ? form.imapPort : '',
          imapSecure: form.provider === 'imap' ? form.imapSecure : true,
          imapUsername: form.provider === 'imap' ? form.imapUsername : '',
          imapPassword: form.provider === 'imap' ? form.imapPassword : '',
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Nepodarilo sa vytvoriť inbox.')

      setForm(DEFAULT_FORM)
      setSuccess(
        !hasSupabase
          ? 'Demo inbox bol pridaný. Spustite sync a TrustStep vytvorí ukážkové e-mailové incidenty.'
          : form.provider === 'imap'
            ? 'IMAP schránka bola pridaná a je pripravená na sync.'
            : 'Inbox bol pridaný. Ďalší krok je dokončiť OAuth autentifikáciu.'
      )
      await reloadInboxes(companyId)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Nepodarilo sa vytvoriť inbox.')
    } finally {
      setSaving(false)
    }
  }

  async function handleInboxAction(id: string, action: 'connected' | 'paused' | 'pending' | 'delete') {
    setBusyInboxId(id)
    setError('')
    setSuccess('')

    try {
      if (action === 'delete') {
        const response = await fetch(`/api/inboxes/${id}`, { method: 'DELETE' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Nepodarilo sa zmazať inbox.')
      } else {
        const response = await fetch(`/api/inboxes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Nepodarilo sa upraviť inbox.')
      }

      await reloadInboxes(companyId)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Akcia sa nepodarila.')
    } finally {
      setBusyInboxId('')
    }
  }

  async function handleSync(inboxId?: string) {
    if (!companyId) return

    setSyncingTarget(inboxId || 'all')
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/inboxes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, inboxId }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Inbox sync zlyhal.')
      }

      const syncSummary = payload.summary as {
        syncedInboxes: number
        fetched: number
        created: number
        skipped: number
        risky: number
      }

      setSuccess(
        `Sync dokončený: ${syncSummary.syncedInboxes} schránok, ${syncSummary.fetched} načítaných mailov, ${syncSummary.created} nových analýz, ${syncSummary.risky} rizikových nálezov.`
      )
      await reloadInboxes(companyId)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Inbox sync zlyhal.')
    } finally {
      setSyncingTarget('')
    }
  }

  function handleStartEdit(inbox: ConnectedInbox) {
    setEditingInboxId(inbox.id)
    setEditForm({
      displayName: inbox.display_name || '',
      scanMode: inbox.scan_mode,
      imapHost: inbox.imap_host || '',
      imapPort: inbox.imap_port ? String(inbox.imap_port) : '993',
      imapSecure: inbox.imap_secure !== false,
      imapUsername: '',
      imapPassword: '',
    })
    setError('')
    setSuccess('')
  }

  function handleCancelEdit() {
    setEditingInboxId('')
    setEditForm(null)
  }

  async function handleSaveSettings(inbox: ConnectedInbox) {
    if (!editForm) return

    setSavingSettingsId(inbox.id)
    setError('')
    setSuccess('')

    try {
      const payload: Record<string, unknown> = {
        displayName: editForm.displayName,
        scanMode: editForm.scanMode,
      }

      if (inbox.provider === 'imap') {
        payload.imapHost = editForm.imapHost
        payload.imapPort = editForm.imapPort
        payload.imapSecure = editForm.imapSecure
        payload.imapUsername = editForm.imapUsername
        payload.imapPassword = editForm.imapPassword
      }

      const response = await fetch(`/api/inboxes/${inbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Nepodarilo sa uložiť nastavenia schránky.')
      }

      await reloadInboxes(companyId)
      setSuccess(
        inbox.provider === 'imap'
          ? 'IMAP prístup bol aktualizovaný.'
          : 'Nastavenia schránky boli aktualizované.'
      )
      handleCancelEdit()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nepodarilo sa uložiť nastavenia schránky.')
    } finally {
      setSavingSettingsId('')
    }
  }

  async function handleTestAlert() {
    if (!companyId) return

    setTestingAlert(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/incident-alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Test alert sa nepodarilo odoslať.')
      }

      setSuccess(payload.message || 'Testovací incident bol odoslaný.')
    } catch (alertError) {
      setError(alertError instanceof Error ? alertError.message : 'Test alert sa nepodarilo odoslať.')
    } finally {
      setTestingAlert(false)
    }
  }

  async function handleRetryAlert(alertId: string) {
    if (!companyId) return

    setRetryingAlertId(alertId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/incident-alerts/${encodeURIComponent(alertId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Alert sa nepodarilo znovu odoslať.')
      }

      setSuccess(payload.message || 'Alert bol znovu odoslaný.')
      await reloadInboxes(companyId)
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Alert sa nepodarilo znovu odoslať.')
    } finally {
      setRetryingAlertId('')
    }
  }

  async function handleSendDigest() {
    if (!companyId) return

    setSendingDigest(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/digests/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Digest sa nepodarilo odoslať.')
      }

      setSuccess(payload.message || 'Denný digest bol odoslaný.')
    } catch (digestError) {
      setError(digestError instanceof Error ? digestError.message : 'Digest sa nepodarilo odoslať.')
    } finally {
      setSendingDigest(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-teal-700 animate-spin" />
      </div>
    )
  }

  const connectedCount = inboxes.filter((inbox) => inbox.status === 'connected').length
  const pendingCount = inboxes.filter((inbox) => inbox.status === 'pending').length
  const currentProviderMeta = getInboxProviderMeta(form.provider)
  const totalScanned24h = Object.values(healthStats).reduce((sum, item) => sum + item.scanned24h, 0)
  const totalRisky7d = Object.values(healthStats).reduce((sum, item) => sum + item.risky7d, 0)

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-teal-500 selection:text-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-teal-700 hover:text-teal-600">
              ← Späť na dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900">Pripojené Schránky</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-gray-500">
              TrustStep tu spravuje webové e-mailové vstupy bez browser extensionu. Gmail už vie prejsť cez read-only OAuth connect,
              Outlook a ostatné schránky ostávajú v rovnakom provider modeli cez Microsoft Graph alebo univerzálny IMAP fallback.
            </p>
            {!hasSupabase && (
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-teal-700">
                Demo režim: pridajte inbox a spustite sync. TrustStep nasimuluje nové podozrivé e-maily a uloží ich do dashboardu aj alert centra.
              </p>
            )}
            <p className="mt-2 text-sm font-semibold text-gray-700">{accountName}</p>
          </div>
          <button
            type="button"
            onClick={() => handleSync()}
            disabled={!companyId || syncingTarget === 'all'}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {syncingTarget === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Spustiť sync teraz
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <span className="text-sm font-semibold text-gray-500">Pripojené inboxy</span>
            <div className="mt-3 text-4xl font-black text-gray-900">{connectedCount}</div>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <span className="text-sm font-semibold text-gray-500">Čakajúce prepojenia</span>
            <div className="mt-3 text-4xl font-black text-amber-600">{pendingCount}</div>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <span className="text-sm font-semibold text-gray-500">Skeny za 24h / riziká 7d</span>
            <div className="mt-3 text-4xl font-black text-teal-700">{totalScanned24h}</div>
            <div className="mt-1 text-sm font-medium text-gray-500">{totalRisky7d} rizikových nálezov za 7 dní</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          {INBOX_PROVIDERS.map((provider) => (
            <div key={provider.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  {provider.id === 'imap' ? <Waypoints className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{provider.label}</h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{provider.defaultMethod}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium leading-relaxed text-gray-600">{provider.description}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Inboxy v účte</h2>
                <p className="text-sm font-medium text-gray-500">Správa schránok, ktoré bude TrustStep skenovať serverovo.</p>
              </div>
            </div>

            <div className="space-y-4">
              {inboxes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-gray-500">
                    Zatiaľ tu nie je žiadna pripojená schránka. Začnite Gmailom, Outlookom alebo IMAP fallbackom.
                  </p>
                </div>
              ) : (
                inboxes.map((inbox) => {
                  const provider = getInboxProviderMeta(inbox.provider)
                  const isBusy = busyInboxId === inbox.id
                  const isEditing = editingInboxId === inbox.id && editForm
                  const stats = healthStats[inbox.email_address.toLowerCase()] ?? {
                    scanned24h: 0,
                    risky7d: 0,
                    total30d: 0,
                    lastRequestAt: null,
                  }

                  return (
                    <div key={inbox.id} className="rounded-2xl border border-gray-100 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-gray-900">{inbox.display_name || inbox.email_address}</span>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getInboxStatusClasses(inbox.status)}`}>
                              {getInboxStatusLabel(inbox.status)}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-gray-500">
                            {provider.label} • {inbox.email_address} • režim {inbox.scan_mode}
                          </div>
                          <div className="mt-1 text-sm font-medium text-gray-500">
                            Posledný sync: {inbox.last_checked_at
                              ? new Date(inbox.last_checked_at).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'zatiaľ nespustený'}
                          </div>
                          {inbox.imap_host && (
                            <div className="mt-1 text-sm font-medium text-gray-500">
                              IMAP: {inbox.imap_host}:{inbox.imap_port || 993} • {inbox.imap_secure ? 'TLS/SSL' : 'bez TLS'}
                            </div>
                          )}
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                              <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">24h</div>
                              <div className="mt-1 text-2xl font-black text-gray-900">{stats.scanned24h}</div>
                              <div className="text-xs font-medium text-gray-500">analyzovaných mailov</div>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                              <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">7 dní</div>
                              <div className={`mt-1 text-2xl font-black ${stats.risky7d > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.risky7d}</div>
                              <div className="text-xs font-medium text-gray-500">rizikových nálezov</div>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                              <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">30 dní</div>
                              <div className="mt-1 text-2xl font-black text-gray-900">{stats.total30d}</div>
                              <div className="text-xs font-medium text-gray-500">spolu spracovaných</div>
                            </div>
                          </div>
                          <div className="mt-3 text-sm font-medium text-gray-500">
                            Posledný analyzovaný mail: {stats.lastRequestAt
                              ? new Date(stats.lastRequestAt).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'zatiaľ žiadny'}
                          </div>
                          {inbox.last_error && inbox.status === 'error' && (
                            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                              Posledná chyba syncu: {inbox.last_error}
                            </div>
                          )}
                          <p className="mt-4 text-sm font-medium leading-relaxed text-gray-700">
                            {getInboxNextStep(inbox)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {inbox.status === 'connected' && (
                            <button
                              type="button"
                              onClick={() => handleSync(inbox.id)}
                              disabled={syncingTarget === inbox.id}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {syncingTarget === inbox.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              Sync teraz
                            </button>
                          )}

                          {(inbox.provider === 'gmail' || inbox.provider === 'outlook') && (
                            hasSupabase ? (
                              <a
                                href={inbox.provider === 'gmail'
                                  ? `/api/inboxes/oauth/google/start?inboxId=${encodeURIComponent(inbox.id)}`
                                  : `/api/inboxes/oauth/outlook/start?inboxId=${encodeURIComponent(inbox.id)}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-50"
                              >
                                <Link2 className="h-4 w-4" />
                                {inbox.provider === 'gmail'
                                  ? (inbox.status === 'connected' ? 'Znovu pripojiť Google' : 'Pripojiť Google')
                                  : (inbox.status === 'connected' ? 'Znovu pripojiť Outlook' : 'Pripojiť Outlook')}
                              </a>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700">
                                <Link2 className="h-4 w-4" />
                                Demo OAuth inbox
                              </div>
                            )
                          )}

                          {inbox.provider === 'imap' && (
                            <button
                              type="button"
                              onClick={() => isEditing ? handleCancelEdit() : handleStartEdit(inbox)}
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              {isEditing ? 'Zavrieť nastavenia' : 'Upraviť prístup'}
                            </button>
                          )}

                          {inbox.status !== 'connected' && (
                            <button
                              type="button"
                              onClick={() => handleInboxAction(inbox.id, 'connected')}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                              Označiť ako pripojené
                            </button>
                          )}

                          {inbox.status === 'paused' ? (
                            <button
                              type="button"
                              onClick={() => handleInboxAction(inbox.id, 'pending')}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                              Obnoviť
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInboxAction(inbox.id, 'paused')}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                              Pozastaviť
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleInboxAction(inbox.id, 'delete')}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Odstrániť
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Názov v dashboarde</label>
                              <input
                                type="text"
                                value={editForm.displayName}
                                onChange={(event) => setEditForm((current) => current ? { ...current, displayName: event.target.value } : current)}
                                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Režim skenovania</label>
                              <select
                                value={editForm.scanMode}
                                onChange={(event) => setEditForm((current) => current ? { ...current, scanMode: event.target.value as EditInboxForm['scanMode'] } : current)}
                                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="auto">Auto scan nových mailov</option>
                                <option value="manual">Len manuálne spustenie</option>
                                <option value="digest">Batch / digest režim</option>
                              </select>
                            </div>
                          </div>

                          {inbox.provider === 'imap' && (
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">IMAP server</label>
                                <input
                                  type="text"
                                  value={editForm.imapHost}
                                  onChange={(event) => setEditForm((current) => current ? { ...current, imapHost: event.target.value } : current)}
                                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Port</label>
                                <input
                                  type="number"
                                  value={editForm.imapPort}
                                  onChange={(event) => setEditForm((current) => current ? { ...current, imapPort: event.target.value } : current)}
                                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">IMAP používateľ</label>
                                <input
                                  type="text"
                                  value={editForm.imapUsername}
                                  onChange={(event) => setEditForm((current) => current ? { ...current, imapUsername: event.target.value } : current)}
                                  placeholder="Nechaj prázdne, ak sa nemení"
                                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">IMAP heslo / app password</label>
                                <input
                                  type="password"
                                  value={editForm.imapPassword}
                                  onChange={(event) => setEditForm((current) => current ? { ...current, imapPassword: event.target.value } : current)}
                                  placeholder="Nechaj prázdne, ak sa nemení"
                                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>

                              <label className="inline-flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 md:col-span-2">
                                <input
                                  type="checkbox"
                                  checked={editForm.imapSecure}
                                  onChange={(event) => setEditForm((current) => current ? { ...current, imapSecure: event.target.checked } : current)}
                                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                Použiť TLS/SSL
                              </label>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveSettings(inbox)}
                              disabled={savingSettingsId === inbox.id}
                              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                              {savingSettingsId === inbox.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                              Uložiť zmeny
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={savingSettingsId === inbox.id}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Zrušiť
                            </button>
                          </div>
                          {inbox.provider === 'imap' && (
                            <p className="mt-3 text-xs font-medium text-gray-500">
                              Pri prázdnom používateľovi alebo hesle TrustStep ponechá existujúce server-side credentials.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pridať novú schránku</h2>
                  <p className="text-sm font-medium text-gray-500">Začiatok pre Gmail, Outlook alebo IMAP fallback.</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleCreateInbox}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Provider</label>
                  <select
                    value={form.provider}
                    onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as InboxProvider }))}
                    className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {INBOX_PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>{provider.label}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs font-medium text-gray-500">{currentProviderMeta.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail schránky</label>
                  <input
                    type="email"
                    value={form.emailAddress}
                    onChange={(event) => setForm((current) => ({ ...current, emailAddress: event.target.value }))}
                    placeholder="napr. finance@firma.sk"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Názov v dashboarde</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                    placeholder="napr. Fakturácia"
                    className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Režim skenovania</label>
                  <select
                    value={form.scanMode}
                    onChange={(event) => setForm((current) => ({ ...current, scanMode: event.target.value as CreateInboxForm['scanMode'] }))}
                    className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="auto">Auto scan nových mailov</option>
                    <option value="manual">Len manuálne spustenie</option>
                    <option value="digest">Batch / digest režim</option>
                  </select>
                </div>

                {form.provider === 'imap' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">IMAP server</label>
                      <input
                        type="text"
                        value={form.imapHost}
                        onChange={(event) => setForm((current) => ({ ...current, imapHost: event.target.value }))}
                        placeholder="imap.firma.sk"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Port</label>
                        <input
                          type="number"
                          value={form.imapPort}
                          onChange={(event) => setForm((current) => ({ ...current, imapPort: event.target.value }))}
                          placeholder="993"
                          className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <label className="mt-8 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.imapSecure}
                          onChange={(event) => setForm((current) => ({ ...current, imapSecure: event.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-600"
                        />
                        TLS/SSL
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">IMAP používateľ</label>
                      <input
                        type="text"
                        value={form.imapUsername}
                        onChange={(event) => setForm((current) => ({ ...current, imapUsername: event.target.value }))}
                        placeholder="napr. finance@firma.sk"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">IMAP heslo / app password</label>
                      <input
                        type="password"
                        value={form.imapPassword}
                        onChange={(event) => setForm((current) => ({ ...current, imapPassword: event.target.value }))}
                        placeholder="••••••••••••"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      <p className="mt-2 text-xs font-medium text-gray-500">
                        Pri Gmail/Outlook IMAP fallbacke používajte app password, nie hlavné heslo účtu.
                      </p>
                    </div>
                  </>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Pridať inbox
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-teal-100 bg-teal-50 p-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-teal-800">Čo nasleduje</h3>
              <ul className="mt-4 space-y-3 text-sm font-medium leading-relaxed text-teal-900">
                {hasSupabase ? (
                  <>
                    <li>Gmail: kliknutím na `Pripojiť Google` dokončíte OAuth a uloží sa read-only prepojenie schránky.</li>
                    <li>Outlook: ďalší krok je rovnaký flow cez Microsoft Graph OAuth callback.</li>
                    <li>IMAP: ďalší krok je bezpečné uloženie prihlasovacích údajov a prvá synchronizácia.</li>
                    <li>Kým OAuth nie je zapojený, stále funguje forwarding, `.eml` upload a mobilný share flow.</li>
                  </>
                ) : (
                  <>
                    <li>Pridajte demo inbox pre Gmail, Outlook alebo IMAP fallback.</li>
                    <li>Kliknite `Spustiť sync teraz` a TrustStep nasimuluje nové podozrivé e-maily.</li>
                    <li>Výsledné incidenty sa objavia v dashboarde aj v alert centre rovnakého účtu.</li>
                    <li>To vám dá plný produktový príbeh aj bez reálnych OAuth integrácií.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Test externých alertov</h3>
                  <p className="text-sm font-medium text-gray-500">Over Slack alebo Teams webhook bez čakania na reálny incident.</p>
                </div>
              </div>

              <p className="text-sm font-medium leading-relaxed text-gray-600">
                TrustStep odošle skúšobný `high-risk` incident cez `INCIDENT_ALERT_WEBHOOK_URL`. Ak webhook nie je nastavený alebo vracia chybu,
                zobrazí sa presná hláška priamo tu.
              </p>

              <button
                type="button"
                onClick={handleTestAlert}
                disabled={!companyId || testingAlert || !hasSupabase}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {testingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                Poslať test alert
              </button>
              {!hasSupabase && (
                <p className="mt-3 text-xs font-medium text-gray-500">
                  Externé webhook alerty sú dostupné po zapojení Supabase a produkčných integrácií.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Denný digest</h3>
                  <p className="text-sm font-medium text-gray-500">Pošli súhrn posledných 24 hodín na approver e-mail firmy.</p>
                </div>
              </div>

              <p className="text-sm font-medium leading-relaxed text-gray-600">
                Digest obsahuje high/medium incidenty, rozpad podľa zdrojov, stav inboxov a počet zlyhaných alertov.
                Hodí sa na interný reporting aj na demo porote.
              </p>

              <button
                type="button"
                onClick={handleSendDigest}
                disabled={!companyId || sendingDigest || !hasSupabase}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {sendingDigest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Poslať denný digest
              </button>
              {!hasSupabase && (
                <p className="mt-3 text-xs font-medium text-gray-500">
                  Denný digest ostáva produkčná funkcia. V demo režime sa sústreďte na sync a incidenty v dashboarde.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-xl font-bold text-gray-900">História alertov</h3>
              <p className="mt-1 text-sm font-medium text-gray-500">Posledné webhook doručenia do Slacku alebo Teams.</p>

              <div className="mt-5 space-y-3">
                {alerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 px-4 py-5 text-sm font-medium text-gray-500">
                    Zatiaľ tu nie je žiadny zaznamenaný alert delivery log.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <SourceBadge source={alert.source} />
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                              alert.status === 'sent'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'border-red-100 bg-red-50 text-red-700'
                            }`}>
                              {alert.status === 'sent' ? 'Odoslané' : 'Zlyhalo'}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700">
                              {alert.channel === 'teams' ? 'Teams' : 'Slack'}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-gray-900">
                            {alert.destination} • {alert.submitted_by}
                          </div>
                          <div className="mt-1 text-xs font-medium text-gray-500">
                            {new Date(alert.created_at).toLocaleString('sk-SK', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {alert.error_message && (
                            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                              {alert.error_message}
                            </div>
                          )}
                        </div>
                        {alert.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetryAlert(alert.id)}
                            disabled={retryingAlertId === alert.id}
                            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                          >
                            {retryingAlertId === alert.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
