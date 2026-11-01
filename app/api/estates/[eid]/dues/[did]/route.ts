import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { dueUpdateSchema } from '@/lib/dues'

type P = { eid: string; did: string }

async function findDue(estateId: number, did: string) {
  const due = await db('dues').where({ id: id(did, 'Due'), estate_id: estateId }).first()
  if (!due) throw notFound('Due')
  return due
}

export const PATCH = handle<P>(async (req, { eid, did }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'dues.manage')
  const due = await findDue(ctx.estate.id, did)
  const body = await parseBody(req, dueUpdateSchema)
  if (Object.keys(body).length) await db('dues').where({ id: due.id }).update(body)
  return ok(await db('dues').where({ id: due.id }).first())
})

/** Deletes a due. Charges already raised stay on residence accounts. */
export const DELETE = handle<P>(async (req, { eid, did }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'dues.manage')
  const due = await findDue(ctx.estate.id, did)
  await db('dues').where({ id: due.id }).delete()
  return noContent()
})
