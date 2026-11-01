import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { badRequest, handle, id, notFound, ok, parseBody } from '@/lib/http'
import { currentPeriod, type Frequency } from '@/lib/dues'

type P = { eid: string; did: string }

const schema = z.object({
  period: z.string().trim().min(1).max(20).optional(),
  residence_ids: z.array(z.number().int().positive()).optional(), // omit to charge every residence
})

/** Raises the due as a charge on residence accounts. Residences already charged for the period are skipped. */
export const POST = handle<P>(async (req, { eid, did }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'dues.manage')
  const due = await db('dues').where({ id: id(did, 'Due'), estate_id: ctx.estate.id }).first()
  if (!due) throw notFound('Due')
  if (due.status !== 'active') throw badRequest('Archived dues cannot be charged')
  const body = await parseBody(req, schema)
  const period = body.period ?? currentPeriod(due.frequency as Frequency)

  const result = await db.transaction(async (trx) => {
    const q = trx('residences').where('estate_id', ctx.estate.id)
    if (body.residence_ids) q.whereIn('id', body.residence_ids)
    const residenceIds: number[] = await q.pluck('id')
    if (!residenceIds.length) throw badRequest('No residences to charge')

    const already: number[] = await trx('residence_transactions')
      .where({ due_id: due.id, period })
      .whereIn('residence_id', residenceIds)
      .pluck('residence_id')
    const toCharge = residenceIds.filter((r) => !already.includes(r))
    const occurredAt = new Date()

    if (toCharge.length) {
      await trx('residence_transactions').insert(
        toCharge.map((residence_id) => ({
          estate_id: ctx.estate.id,
          residence_id,
          type: 'charge',
          amount: due.amount,
          description: period === 'once' ? due.title : `${due.title} (${period})`,
          due_id: due.id,
          period,
          recorded_by: ctx.user.id,
          occurred_at: occurredAt,
        })),
      )
    }
    return { period, charged: toCharge.length, skipped: already.length }
  })
  return ok(result)
})
