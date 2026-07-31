import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const DEV_LEADS_FILE = join(process.cwd(), '.truststep', 'dev-leads.json')

export type DemoLead = {
  id: string
  name: string
  email: string
  company: string
  message: string
  source: string
  created_at: string
}

async function readLeads(): Promise<DemoLead[]> {
  try {
    const raw = await readFile(DEV_LEADS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DemoLead[]) : []
  } catch {
    return []
  }
}

async function writeLeads(leads: DemoLead[]) {
  await mkdir(dirname(DEV_LEADS_FILE), { recursive: true })
  await writeFile(DEV_LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8')
}

export async function createDemoLead(input: Omit<DemoLead, 'id' | 'created_at'>) {
  const lead: DemoLead = {
    id: `lead-${randomUUID()}`,
    created_at: new Date().toISOString(),
    ...input,
  }

  const leads = await readLeads()
  await writeLeads([lead, ...leads])
  return lead
}
