import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { handle, id, noContent, notFound } from '@/lib/http'

type P = { eid: string; aid: string }

/** Retracts an announcement from every inbox. */
export const DELETE = handle<P>(async (req, { eid, aid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'announcements.publish')
  const deleted = await db('announcements').where({ id: id(aid, 'Announcement'), estate_id: ctx.estate.id }).delete()
  if (!deleted) throw notFound('Announcement')
  return noContent()
})
