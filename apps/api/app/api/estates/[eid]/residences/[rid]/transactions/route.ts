import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, authorizeResidence, estateContext, findResidence } from '@/lib/rbac'
import { created, handle, ok, parseBody } from '@/lib/http'
import { residenceBalances } from '@/lib/ledger'

type P = { eid: string; rid: string }

export const GET = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  const residence = await findResidence(ctx, rid)
  authorizeResidence(ctx, residence.id, 'residence_accounts.view')

  const [transactions, balance] = await Promise.all([
    db('residence_transactions as t')
      .leftJoin('dues as d', 'd.id', 't.due_id')
      .leftJoin('users as u', 'u.id', 't.recorded_by')
      .where('t.residence_id', residence.id)
      .orderBy([{ column: 't.occurred_at', order: 'desc' }, { column: 't.id', order: 'desc' }])
      .limit(500)
      .select('t.id', 't.type', 't.amount', 't.description', 't.period', 't.reference', 't.occurred_at', 'd.title as due_title', 'u.name as recorded_by_name'),
    residenceBalances(ctx.estate.id, [residence.id]),
  ])
  return ok({ summary: balance(residence.id), transactions })
})

const schema = z.object({
  type: z.enum(['payment', 'credit', 'charge']),
  amount: z.number().int().positive(), // minor units
  description: z.string().trim().max(255).nullable().optional(),
  reference: z.string().trim().max(100).nullable().optional(),
  occurred_at: z.coerce.date().optional(),
})

/**
 * Records a payment, credit or manual charge on a residence account.
 * Payments are mirrored as income on the estate account.
 */
export const POST = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residence_accounts.manage')
  const residence = await findResidence(ctx, rid)
  const body = await parseBody(req, schema)
  const occurredAt = body.occurred_at ?? new Date()

  const txId = await db.transaction(async (trx) => {
    let estateTransactionId: number | null = null
    if (body.type === 'payment') {
      ;[estateTransactionId] = await trx('estate_transactions').insert({
        estate_id: ctx.estate.id,
        type: 'income',
        category: 'Residence payment',
        amount: body.amount,
        description: `${residence.name}${body.description ? ` — ${body.description}` : ''}`.slice(0, 255),
        reference: body.reference ?? null,
        recorded_by: ctx.user.id,
        occurred_at: occurredAt,
      })
    }
    const [txId] = await trx('residence_transactions').insert({
      estate_id: ctx.estate.id,
      residence_id: residence.id,
      type: body.type,
      amount: body.amount,
      description: body.description ?? null,
      reference: body.reference ?? null,
      estate_transaction_id: estateTransactionId,
      recorded_by: ctx.user.id,
      occurred_at: occurredAt,
    })
    return txId
  })
  return created(await db('residence_transactions').where({ id: txId }).first())
})
