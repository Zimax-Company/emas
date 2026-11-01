import { db } from '@/lib/db'
import { handle, ok } from '@/lib/http'

export const GET = handle(async () => {
  await db.raw('select 1')
  return ok({ status: 'ok' })
})
