import { db } from '@/lib/db'
import { authorizeResidence, estateContext, findResidence } from '@/lib/rbac'
import { handle, ok } from '@/lib/http'

type P = { eid: string; rid: string }

export const GET = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  const residence = await findResidence(ctx, rid)
  authorizeResidence(ctx, residence.id, 'announcements.view')

  const messages = await db('inbox_messages as m')
    .join('announcements as a', 'a.id', 'm.announcement_id')
    .leftJoin('users as u', 'u.id', 'a.author_id')
    .where('m.residence_id', residence.id)
    .orderBy('a.published_at', 'desc')
    .limit(200)
    .select('m.id', 'm.read_at', 'a.id as announcement_id', 'a.title', 'a.body', 'a.published_at', 'u.name as author_name')
  return ok(messages)
})
