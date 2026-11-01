import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { created, handle, ok, parseBody } from '@/lib/http'
import { currentPeriod, dueSchema, type Frequency } from '@/lib/dues'

type P = { eid: string }

export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'dues.view')
  const rows = await db('dues as d')
    .leftJoin('residence_transactions as t', function () {
      this.on('t.due_id', 'd.id').andOnVal('t.type', 'charge')
    })
    .where('d.estate_id', ctx.estate.id)
    .groupBy('d.id')
    .orderBy([{ column: 'd.status', order: 'asc' }, { column: 'd.created_at', order: 'desc' }])
    .select('d.*', db.raw('count(t.id) as charge_count'), db.raw('coalesce(sum(t.amount), 0) as charged_total'))
  return ok(
    rows.map((d) => ({
      ...d,
      charge_count: Number(d.charge_count),
      charged_total: Number(d.charged_total),
      current_period: currentPeriod(d.frequency as Frequency),
    })),
  )
})

export const POST = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'dues.manage')
  const body = await parseBody(req, dueSchema)
  const [dueId] = await db('dues').insert({ ...body, estate_id: ctx.estate.id, created_by: ctx.user.id })
  return created(await db('dues').where({ id: dueId }).first())
})
