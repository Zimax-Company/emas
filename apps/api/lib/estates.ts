import type { Knex } from 'knex'
import { db } from './db'
import type { User } from './auth'
import { DEFAULT_ROLES } from './permissions'

/** Estates (dashboards) a user can open, with their role names in each. */
export async function listEstatesFor(user: User) {
  const memberRoles = await db('estate_members as m')
    .join('estate_member_roles as mr', 'mr.estate_member_id', 'm.id')
    .join('roles as r', 'r.id', 'mr.role_id')
    .where('m.user_id', user.id)
    .select('m.estate_id', 'r.name', 'r.is_admin')

  const q = db('estates').select('id', 'name', 'slug', 'address', 'currency', 'created_at').orderBy('name')
  if (!user.is_system_admin) q.whereIn('id', [...new Set(memberRoles.map((r) => r.estate_id))])
  const estates = await q

  return estates.map((e) => {
    const mine = memberRoles.filter((r) => r.estate_id === e.id)
    return {
      ...e,
      roles: mine.map((r) => r.name),
      is_admin: user.is_system_admin || mine.some((r) => r.is_admin),
    }
  })
}

/** Creates the two default roles every estate ships with. Returns their ids. */
export async function createDefaultRoles(trx: Knex.Transaction, estateId: number) {
  const ids: Record<keyof typeof DEFAULT_ROLES, number> = { admin: 0, resident: 0 }
  for (const key of Object.keys(DEFAULT_ROLES) as (keyof typeof DEFAULT_ROLES)[]) {
    const def = DEFAULT_ROLES[key]
    const [roleId] = await trx('roles').insert({
      estate_id: estateId,
      name: def.name,
      slug: def.slug,
      description: def.description,
      is_default: true,
      is_admin: def.is_admin,
    })
    await trx('role_permissions').insert(def.permissions.map((p) => ({ role_id: roleId, permission_key: p })))
    ids[key] = roleId
  }
  return ids
}

export async function roleIdBySlug(estateId: number, slug: string, trx: Knex | Knex.Transaction = db) {
  const row = await trx('roles').where({ estate_id: estateId, slug }).first('id')
  return row ? Number(row.id) : null
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}
