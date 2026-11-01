import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSystemAdmin, toUser, USER_COLUMNS } from '@/lib/auth'
import { conflict, created, handle, ok, parseBody, parseQuery } from '@/lib/http'
import { findOrCreateUser, newUserSchema } from '@/lib/users'

export const GET = handle(async (req) => {
  await requireSystemAdmin(req)
  const { q } = parseQuery(req, z.object({ q: z.string().trim().optional() }))
  const query = db('users').select([...USER_COLUMNS, 'last_login_at', 'created_at']).orderBy('name').limit(500)
  if (q) query.where((w) => w.whereLike('name', `%${q}%`).orWhereLike('email', `%${q}%`))
  const rows = await query
  return ok(rows.map((r) => ({ ...toUser(r), last_login_at: r.last_login_at, created_at: r.created_at })))
})

const schema = newUserSchema.extend({ is_system_admin: z.boolean().default(false) })

export const POST = handle(async (req) => {
  await requireSystemAdmin(req)
  const body = await parseBody(req, schema)
  const res = await db.transaction(async (trx) => {
    const res = await findOrCreateUser(trx, body)
    if (!res.created) throw conflict('A user with this email already exists')
    if (body.is_system_admin) await trx('users').where({ id: res.user.id }).update({ is_system_admin: true })
    return { ...res, user: { ...res.user, is_system_admin: body.is_system_admin } }
  })
  return created(res)
})
