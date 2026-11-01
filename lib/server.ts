// Server-side data loading for pages. Calls route handlers in-process with the session token,
// so pages get exactly the same validation and permission checks as the public API.
import { cache } from 'react'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { notFound, redirect } from 'next/navigation'
import { SESSION_COOKIE } from './auth'
import type { EstateAccess, Me } from './types'
import { GET as getMeRoute } from '@/app/api/auth/me/route'
import { GET as getEstateRoute } from '@/app/api/estates/[eid]/route'

type Handler<P> = (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>

export async function load<T, P extends Record<string, string> = Record<string, string>>(
  handler: Handler<P>,
  params: P = {} as P,
  query: Record<string, string | undefined> = {},
): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) redirect('/login')

  const search = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString()
  const req = new NextRequest(`http://internal.local/${search ? `?${search}` : ''}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  const res = await handler(req, { params: Promise.resolve(params) })
  if (res.status === 401) redirect('/login')
  // Pages don't reveal records the caller can't access.
  if (res.status === 403 || res.status === 404) notFound()
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`)
  return json.data as T
}

/** The signed-in user and their estates (memoised per request). */
export const getMe = cache(() => load<Me>(getMeRoute))

/** The estate and the caller's access to it (memoised per request). */
export const getEstate = cache((eid: string) => load<EstateAccess, { eid: string }>(getEstateRoute, { eid }))

/** Pages render in parallel with layouts, so system-admin pages guard themselves. */
export async function requireSystemAdminPage() {
  const me = await getMe()
  if (!me.user.is_system_admin) redirect('/')
  return me
}

export const can = (e: EstateAccess, perm: string) => e.access.permissions.includes(perm)

export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function param(searchParams: SearchParams, key: string) {
  const v = (await searchParams)[key]
  return typeof v === 'string' && v ? v : undefined
}
