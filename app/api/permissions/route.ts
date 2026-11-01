import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { handle, ok } from '@/lib/http'

export const GET = handle(async (req) => {
  await requireUser(req)
  return ok(await db('permissions').select('key', 'group', 'label').orderBy(['group', 'key']))
})
