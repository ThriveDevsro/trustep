import { NextRequest, NextResponse } from 'next/server'
import { createShareDraft } from '@/lib/share-drafts'

const MAX_SHARED_FILE_BYTES = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const formData = (await req.formData()) as unknown as {
      get(name: string): FormDataEntryValue | null
    }
    const title = String(formData.get('shared_title') || '').trim()
    const text = String(formData.get('shared_text') || '').trim()
    const url = String(formData.get('shared_url') || '').trim()
    const file = formData.get('shared_file')

    let sharedFile:
      | {
          name: string
          type: string
          dataUrl: string
        }
      | undefined

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_SHARED_FILE_BYTES) {
        return NextResponse.redirect(new URL('/submit?share_error=file_too_large', req.url), 303)
      }

      const isImage = file.type.startsWith('image/')
      const isAudio = file.type.startsWith('audio/')

      if (!isImage && !isAudio) {
        return NextResponse.redirect(new URL('/submit?share_error=unsupported_file', req.url), 303)
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      sharedFile = {
        name: file.name,
        type: file.type,
        dataUrl: `data:${file.type};base64,${buffer.toString('base64')}`,
      }
    }

    const draft = createShareDraft({
      title: title || undefined,
      text: text || undefined,
      url: url || undefined,
      file: sharedFile,
    })

    const redirectPath = sharedFile?.type.startsWith('audio/')
      ? `/submit-call?share_draft=${draft.id}`
      : `/submit?share_draft=${draft.id}`

    return NextResponse.redirect(new URL(redirectPath, req.url), 303)
  } catch (error) {
    console.error('[share-target]', error)
    return NextResponse.redirect(new URL('/submit?share_error=failed', req.url), 303)
  }
}
