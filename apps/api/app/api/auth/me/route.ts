import { requireUser } from '@/lib/auth'
import { handle, ok } from '@/lib/http'
import { listEstatesFor } from '@/lib/estates'

export const GET = handle(async (req) => {
  const user = await requireUser(req)
  return ok({ user, estates: await listEstatesFor(user) })
})
