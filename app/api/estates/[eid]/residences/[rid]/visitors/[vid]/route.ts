import { db } from '@/lib/db'
import { authorizeResidence, estateContext, findResidence } from '@/lib/rbac'
import { conflict, handle, id, noContent, notFound } from '@/lib/http'

type P = { eid: string; rid: string; vid: string }

/** Cancels a pass that hasn't been used yet; both of its codes stop working. */
export const DELETE = handle<P>(async (req, { eid, rid, vid }) => {
  const ctx = await estateContext(req, eid)
  const residence = await findResidence(ctx, rid)
  authorizeResidence(ctx, residence.id, 'visitors.manage')
  const pass = await db('visitor_passes').where({ id: id(vid, 'Visitor pass'), residence_id: residence.id }).first()
  if (!pass) throw notFound('Visitor pass')
  if (pass.checked_in_at) throw conflict('The visitor has already checked in, so the pass can no longer be cancelled')
  if (pass.cancelled_at) return noContent()

  await db.transaction(async (trx) => {
    const now = new Date()
    await trx('visitor_passes').where({ id: pass.id }).update({ cancelled_at: now, updated_at: now })
    await trx('visitor_codes').where({ pass_id: pass.id }).update({ active_code: null })
  })
  return noContent()
})
