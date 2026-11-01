import { z } from 'zod'
import { estateContext } from '@/lib/rbac'
import { forbidden, handle, ok, parseQuery } from '@/lib/http'
import { passQuery, withCodes } from '@/lib/visitors'

type P = { eid: string }

const query = z.object({
  status: z.enum(['expected', 'inside', 'recent']).default('recent'),
})

/** Gate log across the estate, for gate staff and holders of visitors.view. Codes are never included. */
export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  if (!ctx.permissions.has('visitors.view') && !ctx.permissions.has('visitors.validate')) throw forbidden()
  const { status } = parseQuery(req, query)
  const now = new Date()

  const q = passQuery(ctx.estate.id).limit(200)
  if (status === 'inside') {
    q.whereNotNull('p.checked_in_at').whereNull('p.checked_out_at').orderBy('p.checked_in_at', 'desc')
  } else if (status === 'expected') {
    q.whereNull('p.checked_in_at').whereNull('p.cancelled_at').where('p.expires_at', '>=', now).orderBy('p.valid_from')
  } else {
    q.orderBy([{ column: 'p.updated_at', order: 'desc' }, { column: 'p.id', order: 'desc' }])
  }
  return ok(await withCodes(await q, false))
})
