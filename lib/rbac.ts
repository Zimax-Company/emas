import type { NextRequest } from 'next/server'
import { db } from './db'
import { requireUser, type User } from './auth'
import { forbidden, id, notFound } from './http'
import { PERMISSIONS, type Permission } from './permissions'

export type Estate = { id: number; name: string; slug: string; address: string | null; currency: string }

export type EstateContext = {
  user: User
  estate: Estate
  /** true for system admins and holders of the estate's admin role */
  isAdmin: boolean
  permissions: Set<Permission>
  roles: { id: number; name: string; slug: string }[]
  /** residences this user lives in, within this estate */
  residenceIds: number[]
}

/** Permissions a user holds in one estate, from all their roles. */
export async function loadMembership(userId: number, estateId: number) {
  const roles = await db('estate_members as m')
    .join('estate_member_roles as mr', 'mr.estate_member_id', 'm.id')
    .join('roles as r', 'r.id', 'mr.role_id')
    .where({ 'm.user_id': userId, 'm.estate_id': estateId })
    .select('r.id', 'r.name', 'r.slug', 'r.is_admin')

  const isAdmin = roles.some((r) => r.is_admin)
  let permissions: Permission[]
  if (isAdmin) {
    permissions = [...PERMISSIONS]
  } else if (roles.length) {
    const rows = await db('role_permissions').whereIn('role_id', roles.map((r) => r.id)).distinct('permission_key')
    permissions = rows.map((r) => r.permission_key)
  } else {
    permissions = []
  }

  return {
    isMember: roles.length > 0,
    isAdmin,
    permissions,
    roles: roles.map((r) => ({ id: Number(r.id), name: r.name, slug: r.slug })),
  }
}

/**
 * Authenticates the request and loads the caller's access to an estate.
 * System admins have every permission; estate admins have every permission in their estate.
 */
export async function estateContext(req: NextRequest, estateIdParam: string): Promise<EstateContext> {
  const user = await requireUser(req)
  const estateId = id(estateIdParam, 'Estate')
  const estate = await db('estates').select('id', 'name', 'slug', 'address', 'currency').where({ id: estateId }).first()
  if (!estate) throw notFound('Estate')

  const m = await loadMembership(user.id, estateId)
  if (!m.isMember && !user.is_system_admin) throw notFound('Estate')

  const residenceIds = (
    await db('residence_residents as rr')
      .join('residences as r', 'r.id', 'rr.residence_id')
      .where({ 'rr.user_id': user.id, 'r.estate_id': estateId })
      .pluck('r.id')
  ).map(Number)

  const isAdmin = user.is_system_admin || m.isAdmin
  return {
    user,
    estate: { ...estate, id: Number(estate.id) },
    isAdmin,
    permissions: new Set(isAdmin ? PERMISSIONS : m.permissions),
    roles: m.roles,
    residenceIds,
  }
}

export const can = (ctx: EstateContext, perm: Permission) => ctx.permissions.has(perm)

export function authorize(ctx: EstateContext, perm: Permission) {
  if (!can(ctx, perm)) throw forbidden()
}

/** Residents may act on their own residence; otherwise the given permission is required. */
export function authorizeResidence(ctx: EstateContext, residenceId: number, perm: Permission) {
  if (can(ctx, perm) || ctx.residenceIds.includes(residenceId)) return
  throw forbidden()
}

export async function findResidence(ctx: EstateContext, residenceIdParam: string) {
  const residenceId = id(residenceIdParam, 'Residence')
  const residence = await db('residences').where({ id: residenceId, estate_id: ctx.estate.id }).first()
  if (!residence) throw notFound('Residence')
  return residence as Record<string, unknown> & { id: number }
}
