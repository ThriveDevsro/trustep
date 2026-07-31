type ShareDraftFile = {
  name: string
  type: string
  dataUrl: string
}

export type ShareDraft = {
  id: string
  createdAt: number
  title?: string
  text?: string
  url?: string
  file?: ShareDraftFile
}

const DRAFT_TTL_MS = 1000 * 60 * 15

declare global {
  // eslint-disable-next-line no-var
  var __truststepShareDrafts: Map<string, ShareDraft> | undefined
}

const shareDrafts = globalThis.__truststepShareDrafts ?? new Map<string, ShareDraft>()
globalThis.__truststepShareDrafts = shareDrafts

function cleanupExpiredDrafts() {
  const now = Date.now()

  for (const [id, draft] of Array.from(shareDrafts.entries())) {
    if (now - draft.createdAt > DRAFT_TTL_MS) {
      shareDrafts.delete(id)
    }
  }
}

export function createShareDraft(input: Omit<ShareDraft, 'id' | 'createdAt'>): ShareDraft {
  cleanupExpiredDrafts()

  const draft: ShareDraft = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...input,
  }

  shareDrafts.set(draft.id, draft)
  return draft
}

export function getShareDraft(id: string): ShareDraft | null {
  cleanupExpiredDrafts()

  const draft = shareDrafts.get(id)
  if (!draft) return null
  return draft
}
