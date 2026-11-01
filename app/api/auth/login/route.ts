import { z } from 'zod'
import { db } from '@/lib/db'
import { issueToken, setSessionCookie, toUser, verifyPassword } from '@/lib/auth'
import { ApiError, handle, ok, parseBody } from '@/lib/http'

const schema = z.object({ email: z.email().transform((e) => e.toLowerCase()), password: z.string().min(1) })

export const POST = handle(async (req) => {
  const { email, password } = await parseBody(req, schema)
  const row = await db('users').where({ email }).first()
  if (!row || !row.is_active || !(await verifyPassword(password, row.password_hash))) {
    throw new ApiError(401, 'Invalid email or password')
  }
  await db('users').where({ id: row.id }).update({ last_login_at: new Date() })
  const token = await issueToken(row.id)
  // Token in the body for API clients; httpOnly cookie for the web UI.
  const res = ok({ token, user: toUser(row) })
  setSessionCookie(res, req, token)
  return res
})
