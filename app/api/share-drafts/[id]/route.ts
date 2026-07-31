import { NextRequest, NextResponse } from 'next/server'
import { getShareDraft } from '@/lib/share-drafts'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const draft = getShareDraft(params.id)

  if (!draft) {
    return NextResponse.json({ error: 'Share draft not found' }, { status: 404 })
  }

  return NextResponse.json(draft)
}
