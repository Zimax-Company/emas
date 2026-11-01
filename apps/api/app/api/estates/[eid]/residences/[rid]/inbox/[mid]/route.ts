import { db } from '@/lib/db'
import { estateContext, findResidence } from '@/lib/rbac'
import { forbidden, handle, id, noContent, notFound } from '@/lib/http'

type P = { eid: string; rid: string; mid: string }

/** Marks an inbox message as read. Only residents of the residence can do this. */
export const PATCH = handle<P>(async (req, { eid, rid, mid }) => {
  const ctx = await estateContext(req, eid)
  const residence = await findResidence(ctx, rid)
  if (!ctx.residenceIds.includes(residence.id)) throw forbidden('Only residents can mark their inbox as read')
  const updated = await db('inbox_messages')
    .where({ id: id(mid, 'Message'), residence_id: residence.id })
    .whereNull('read_at')
    .update({ read_at: new Date(), read_by: ctx.user.id })
  if (!updated && !(await db('inbox_messages').where({ id: Number(mid), residence_id: residence.id }).first('id'))) {
    throw notFound('Message')
  }
  return noContent()
})
