import { NextRequest, NextResponse } from 'next/server'
import { createDemoLead } from '@/lib/dev-leads-store'

function normalize(value: unknown) {
  return String(value || '').trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = normalize(body.name)
    const email = normalize(body.email).toLowerCase()
    const company = normalize(body.company)
    const message = normalize(body.message)
    const source = normalize(body.source) || 'web'

    if (!name || !email || !company) {
      return NextResponse.json({ error: 'Vyplňte meno, e-mail a firmu.' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Zadajte platný e-mail.' }, { status: 400 })
    }

    const lead = await createDemoLead({
      name,
      email,
      company,
      message,
      source,
    })

    return NextResponse.json({ success: true, leadId: lead.id })
  } catch (error) {
    console.error('[leads]', error)
    return NextResponse.json({ error: 'Nepodarilo sa odoslať dopyt.' }, { status: 500 })
  }
}
