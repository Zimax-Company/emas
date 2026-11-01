import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, requireSystemAdmin, toUser, USER_COLUMNS } from '@/lib/auth'
import { badRequest, handle, id, notFound, ok, parseBody } from '@/lib/http'

type P = { uid: string }

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  is_active: z.boolean().optional(),
  is_system_admin: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export const PATCH = handle<P>(async (req, { uid }) => {
  const me = await requireSystemAdmin(req)
  const userId = id(uid, 'User')
  if (!(await db('users').where({ id: userId }).first('id'))) throw notFound('User')
  const { password, ...body } = await parseBody(req, schema)
  if (userId === me.id && (body.is_active === false || body.is_system_admin === false)) {
    throw badRequest('You cannot disable or demote yourself')
  }
  const patch: Record<string, unknown> = { ...body }
  if (password) patch.password_hash = await hashPassword(password)
  if (Object.keys(patch).length) await db('users').where({ id: userId }).update(patch)
  return ok(toUser(await db('users').select(USER_COLUMNS).where({ id: userId }).first()))
})
