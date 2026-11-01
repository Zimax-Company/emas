import { db } from '@/lib/db'
import { authorize, estateContext, findResidence } from '@/lib/rbac'
import { handle, id, noContent } from '@/lib/http'

type P = { eid: string; rid: string; uid: string }

export const DELETE = handle<P>(async (req, { eid, rid, uid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residences.manage')
  const residence = await findResidence(ctx, rid)
  await db('residence_residents').where({ residence_id: residence.id, user_id: id(uid, 'User') }).delete()
  return noContent()
})
