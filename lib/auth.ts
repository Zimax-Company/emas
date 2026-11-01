import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { forbidden, unauthorized } from './http'

export type User = {
  id: number
  name: string
  email: string
  phone: string | null
  is_system_admin: boolean
  is_active: boolean
}

export const SESSION_COOKIE = 'emas_token'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

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

/** Sets the httpOnly session cookie used by the web UI. */
export function setSessionCookie(res: NextResponse, req: NextRequest, token: string) {
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

/**
 * Bearer header (API clients) or session cookie (web UI). Cookie-authenticated writes must be
 * same-origin; SameSite=Lax already blocks most cross-site requests, this closes the rest.
 */
function tokenFrom(req: NextRequest) {
  const header = req.headers.get('authorization') ?? ''
  if (header.startsWith('Bearer ')) return header.slice(7)

  const cookie = req.cookies.get(SESSION_COOKIE)?.value
  if (!cookie) return null
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    if (origin && new URL(origin).host !== host) throw forbidden('Cross-origin request rejected')
  }
  return cookie
}

/** Resolves the authenticated user from the Bearer token or session cookie, or throws 401. */
export async function requireUser(req: NextRequest): Promise<User> {
  const token = tokenFrom(req)
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
  if (!user.is_system_admin) throw forbidden('System admin only')
  return user
}

export function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
