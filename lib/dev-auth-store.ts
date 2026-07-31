import { cookies } from 'next/headers'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AppUser } from '@/lib/app-auth'

const DEV_AUTH_FILE = join(process.cwd(), '.truststep', 'dev-auth.json')
const DEV_SESSION_COOKIE = 'truststep_dev_session'

type StoredDevUser = {
  id: string
  email: string
  passwordHash: string
  createdAt: string
}

type StoredDevSession = {
  token: string
  userId: string
  createdAt: string
}

type DevAuthData = {
  users: StoredDevUser[]
  sessions: StoredDevSession[]
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function readAuthData(): Promise<DevAuthData> {
  try {
    const raw = await readFile(DEV_AUTH_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<DevAuthData>
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    }
  } catch {
    return { users: [], sessions: [] }
  }
}

async function writeAuthData(data: DevAuthData) {
  await mkdir(dirname(DEV_AUTH_FILE), { recursive: true })
  await writeFile(DEV_AUTH_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function hashPassword(password: string, salt?: string) {
  const actualSalt = salt ?? randomBytes(16).toString('hex')
  const derived = scryptSync(password, actualSalt, 64).toString('hex')
  return `${actualSalt}:${derived}`
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, expected] = passwordHash.split(':')
  if (!salt || !expected) return false
  const actual = hashPassword(password, salt).split(':')[1]
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

function toAppUser(user: StoredDevUser): AppUser {
  return {
    id: user.id,
    email: user.email,
    provider: 'local',
  }
}

export async function createDevUser(email: string, password: string): Promise<AppUser> {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Zadajte platný e-mail.')
  }

  if (password.length < 6) {
    throw new Error('Heslo musí mať aspoň 6 znakov.')
  }

  const data = await readAuthData()
  if (data.users.some((user) => user.email === normalizedEmail)) {
    throw new Error('Účet s týmto e-mailom už existuje.')
  }

  const user: StoredDevUser = {
    id: `dev-${randomUUID()}`,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  data.users.push(user)
  await writeAuthData(data)

  return toAppUser(user)
}

export async function authenticateDevUser(email: string, password: string): Promise<AppUser> {
  const normalizedEmail = normalizeEmail(email)
  const data = await readAuthData()
  const user = data.users.find((candidate) => candidate.email === normalizedEmail)

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Nesprávny e-mail alebo heslo.')
  }

  return toAppUser(user)
}

export async function createDevSession(userId: string) {
  const data = await readAuthData()
  const token = randomUUID()

  data.sessions = data.sessions.filter((session) => session.userId !== userId)
  data.sessions.push({
    token,
    userId,
    createdAt: new Date().toISOString(),
  })

  await writeAuthData(data)
  return token
}

export async function clearDevSession(token: string) {
  if (!token) return
  const data = await readAuthData()
  data.sessions = data.sessions.filter((session) => session.token !== token)
  await writeAuthData(data)
}

export async function getDevUserBySessionToken(token: string | undefined): Promise<AppUser | null> {
  if (!token) return null

  const data = await readAuthData()
  const session = data.sessions.find((candidate) => candidate.token === token)
  if (!session) return null

  const user = data.users.find((candidate) => candidate.id === session.userId)
  return user ? toAppUser(user) : null
}

export async function getCurrentDevSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(DEV_SESSION_COOKIE)?.value
  return getDevUserBySessionToken(token)
}

export function getDevSessionCookieName() {
  return DEV_SESSION_COOKIE
}
