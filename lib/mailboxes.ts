import type { ConnectedInbox, InboxConnectionMethod, InboxProvider, InboxStatus } from '@/lib/types'

export const INBOX_PROVIDERS: Array<{
  id: InboxProvider
  label: string
  description: string
  defaultMethod: InboxConnectionMethod
}> = [
  {
    id: 'gmail',
    label: 'Gmail',
    description: 'Google Workspace alebo osobný Gmail cez read-only OAuth sync.',
    defaultMethod: 'oauth',
  },
  {
    id: 'outlook',
    label: 'Outlook / Microsoft 365',
    description: 'Outlook.com alebo Microsoft 365 cez Microsoft Graph read-only sync.',
    defaultMethod: 'oauth',
  },
  {
    id: 'imap',
    label: 'Iný e-mail cez IMAP',
    description: 'Firemné alebo vlastné schránky cez IMAP ako univerzálny fallback.',
    defaultMethod: 'imap',
  },
]

export function getInboxProviderMeta(provider: InboxProvider) {
  return INBOX_PROVIDERS.find((item) => item.id === provider) ?? INBOX_PROVIDERS[0]
}

export function getInboxStatusLabel(status: InboxStatus): string {
  switch (status) {
    case 'connected':
      return 'Pripojené'
    case 'paused':
      return 'Pozastavené'
    case 'error':
      return 'Chyba'
    default:
      return 'Čaká na dokončenie'
  }
}

export function getInboxStatusClasses(status: InboxStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-50 text-green-700 border-green-100'
    case 'paused':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'error':
      return 'bg-red-50 text-red-700 border-red-100'
    default:
      return 'bg-amber-50 text-amber-700 border-amber-100'
  }
}

export function getInboxNextStep(inbox: ConnectedInbox): string {
  if (inbox.status === 'connected') {
    return inbox.scan_mode === 'auto'
      ? 'Schránka je pripravená na automatické skenovanie nových správ.'
      : 'Schránka je pripojená. Skenovanie sa spustí len manuálne alebo v dávkach.'
  }

  if (inbox.status === 'paused') {
    return 'Skenovanie je pozastavené. Po obnovení bude TrustStep pokračovať bez straty histórie.'
  }

  if (inbox.status === 'error') {
    return inbox.last_error || 'Pripojenie vyžaduje opravu alebo opätovnú autorizáciu.'
  }

  if (inbox.connection_method === 'oauth') {
    return 'Ďalší krok je dokončiť OAuth prepojenie a povoliť read-only prístup k schránke.'
  }

  return 'IMAP schránka čaká na server-side sync. Skontrolujte server, port a prihlasovacie údaje.'
}
