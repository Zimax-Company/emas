import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { db } from './db'
import { unauthorized } from './http'

export type User = {
  id: number
  name: string
  email: string
  phone: string | null
  is_system_admin: boolean
  is_active: boolean
}

export const USER_COLUMNS = ['id', 'name', 'email', 'phone', 'is_system_admin', 'is_active'] as const

function secret() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters long')
  return new TextEncoder().encode(s)
}

export async function issueToken(userId: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_TTL || '7d')
    .sign(secret())
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10)
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

export function toUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: (row.phone as string) ?? null,
    is_system_admin: Boolean(row.is_system_admin),
    is_active: Boolean(row.is_active),
  }
}

/** Resolves the authenticated user from the Bearer token, or throws 401. */
export async function requireUser(req: NextRequest): Promise<User> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw unauthorized()

  let sub: string | undefined
  try {
    ;({ payload: { sub } } = await jwtVerify(token, secret(), { algorithms: ['HS256'] }))
  } catch {
    throw unauthorized('Invalid or expired token')
  }

  const row = await db('users').select(USER_COLUMNS).where({ id: Number(sub) }).first()
  if (!row || !row.is_active) throw unauthorized('Account not found or disabled')
  return toUser(row)
}

export async function requireSystemAdmin(req: NextRequest) {
  const user = await requireUser(req)
  if (!user.is_system_admin) throw (await import('./http')).forbidden('System admin only')
  return user
}

export function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
