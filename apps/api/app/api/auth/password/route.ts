import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, requireUser, verifyPassword } from '@/lib/auth'
import { badRequest, handle, noContent, parseBody } from '@/lib/http'

const schema = z.object({ current_password: z.string().min(1), new_password: z.string().min(8) })

export const PUT = handle(async (req) => {
  const user = await requireUser(req)
  const body = await parseBody(req, schema)
  const row = await db('users').select('password_hash').where({ id: user.id }).first()
  if (!(await verifyPassword(body.current_password, row.password_hash))) throw badRequest('Current password is incorrect')
  await db('users').where({ id: user.id }).update({ password_hash: await hashPassword(body.new_password) })
  return noContent()
})
