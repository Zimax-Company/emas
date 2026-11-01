import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { badRequest, handle, id, noContent, notFound } from '@/lib/http'

type P = { eid: string; tid: string }

export const DELETE = handle<P>(async (req, { eid, tid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'estate_accounts.manage')
  const tx = await db('estate_transactions').where({ id: id(tid, 'Transaction'), estate_id: ctx.estate.id }).first()
  if (!tx) throw notFound('Transaction')
  if (await db('residence_transactions').where({ estate_transaction_id: tx.id }).first('id')) {
    throw badRequest('This income came from a residence payment; reverse it on the residence account instead')
  }
  await db('estate_transactions').where({ id: tx.id }).delete()
  return noContent()
})
