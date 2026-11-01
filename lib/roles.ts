import type { Knex } from 'knex'
import { z } from 'zod'
import { db } from './db'
import { badRequest, forbidden } from './http'
import type { EstateContext } from './rbac'
import { PERMISSIONS, type Permission } from './permissions'

export const roleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(255).nullable().optional(),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
})

export const roleUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(255).nullable().optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
})

export async function listRoles(estateId: number) {
  const roles = await db('roles as r')
    .leftJoin('estate_member_roles as mr', 'mr.role_id', 'r.id')
    .where('r.estate_id', estateId)
    .groupBy('r.id')
    .orderBy([{ column: 'r.is_admin', order: 'desc' }, { column: 'r.is_default', order: 'desc' }, 'r.name'])
    .select('r.id', 'r.name', 'r.slug', 'r.description', 'r.is_default', 'r.is_admin', db.raw('count(mr.role_id) as member_count'))

  const perms = await db('role_permissions').whereIn('role_id', roles.map((r) => r.id))
  return roles.map((r) => ({
    ...r,
    is_default: Boolean(r.is_default),
    is_admin: Boolean(r.is_admin),
    member_count: Number(r.member_count),
    permissions: r.is_admin ? [...PERMISSIONS] : perms.filter((p) => p.role_id === r.id).map((p) => p.permission_key),
  }))
}

/** Non-admins may only hand out permissions they hold themselves. */
export function assertCanGrant(ctx: EstateContext, permissions: Permission[]) {
  if (ctx.isAdmin) return
  const missing = permissions.filter((p) => !ctx.permissions.has(p))
  if (missing.length) throw forbidden(`You cannot grant permissions you do not hold: ${missing.join(', ')}`)
}

/** Validates role ids belong to the estate; only admins may assign the admin role. */
export async function resolveAssignableRoles(ctx: EstateContext, roleIds: number[], trx: Knex | Knex.Transaction = db) {
  if (!roleIds.length) return []
  const roles = await trx('roles').whereIn('id', roleIds).andWhere('estate_id', ctx.estate.id)
  if (roles.length !== new Set(roleIds).size) throw badRequest('One or more roles do not belong to this estate')
  if (!ctx.isAdmin && roles.some((r) => r.is_admin)) throw forbidden('Only estate admins can assign the admin role')
  return roles.map((r) => Number(r.id))
}

/** Prevents an estate from being left without an admin. */
export async function assertAdminRemains(trx: Knex | Knex.Transaction, estateId: number, excludingMemberId: number) {
  const row = await trx('estate_member_roles as mr')
    .join('roles as r', 'r.id', 'mr.role_id')
    .where({ 'r.estate_id': estateId, 'r.is_admin': true })
    .whereNot('mr.estate_member_id', excludingMemberId)
    .count({ n: '*' })
    .first()
  if (!Number(row?.n)) throw badRequest('An estate must keep at least one estate admin')
}
