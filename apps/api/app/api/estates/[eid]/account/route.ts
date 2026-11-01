import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { created, handle, ok, parseBody, parseQuery } from '@/lib/http'
import { estateAccountSummary } from '@/lib/ledger'

type P = { eid: string }

const query = z.object({
  type: z.enum(['income', 'expense']).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
})

export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'estate_accounts.view')
  const f = parseQuery(req, query)
  const from = f.from ? new Date(`${f.from}T00:00:00Z`) : undefined
  // `to` is inclusive of the whole day.
  const to = f.to ? new Date(new Date(`${f.to}T00:00:00Z`).getTime() + 86_400_000) : undefined

  const scoped = () => {
    const q = db('estate_transactions as t').where('t.estate_id', ctx.estate.id)
    if (from) q.where('t.occurred_at', '>=', from)
    if (to) q.where('t.occurred_at', '<', to)
    return q
  }

  const listQ = scoped()
    .leftJoin('users as u', 'u.id', 't.recorded_by')
    .leftJoin('residence_transactions as rt', 'rt.estate_transaction_id', 't.id')
    .orderBy([{ column: 't.occurred_at', order: 'desc' }, { column: 't.id', order: 'desc' }])
    .limit(500)
    .select('t.*', 'u.name as recorded_by_name', 'rt.residence_id')
  if (f.type) listQ.where('t.type', f.type)

  const [transactions, byCategory, summary, allTime] = await Promise.all([
    listQ,
    scoped().groupBy('t.type', 't.category').select('t.type', 't.category', db.raw('sum(t.amount) as total')).orderBy('total', 'desc'),
    estateAccountSummary(ctx.estate.id, from, to),
    estateAccountSummary(ctx.estate.id),
  ])

  return ok({
    summary,
    balance: allTime.net,
    by_category: byCategory.map((c) => ({ ...c, total: Number(c.total) })),
    transactions,
  })
})

const schema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().trim().min(1).max(80),
  amount: z.number().int().positive(), // minor units
  description: z.string().trim().max(255).nullable().optional(),
  reference: z.string().trim().max(100).nullable().optional(),
  occurred_at: z.coerce.date().optional(),
})

export const POST = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'estate_accounts.manage')
  const body = await parseBody(req, schema)
  const [txId] = await db('estate_transactions').insert({
    ...body,
    occurred_at: body.occurred_at ?? new Date(),
    estate_id: ctx.estate.id,
    recorded_by: ctx.user.id,
  })
  return created(await db('estate_transactions').where({ id: txId }).first())
})
