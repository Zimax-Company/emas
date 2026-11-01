import { db } from './db'

export type Balance = { charged: number; paid: number; balance: number }

/** Residence account balances (amount owed = charges - payments - credits). */
export async function residenceBalances(estateId: number, residenceIds?: number[]) {
  const q = db('residence_transactions')
    .where('estate_id', estateId)
    .groupBy('residence_id')
    .select(
      'residence_id',
      db.raw("coalesce(sum(case when type = 'charge' then amount else 0 end), 0) as charged"),
      db.raw("coalesce(sum(case when type <> 'charge' then amount else 0 end), 0) as paid"),
    )
  if (residenceIds) q.whereIn('residence_id', residenceIds)
  const rows = await q
  const map = new Map<number, Balance>()
  for (const r of rows) {
    const charged = Number(r.charged)
    const paid = Number(r.paid)
    map.set(Number(r.residence_id), { charged, paid, balance: charged - paid })
  }
  return (rid: number): Balance => map.get(rid) ?? { charged: 0, paid: 0, balance: 0 }
}

export async function estateAccountSummary(estateId: number, from?: Date, to?: Date) {
  const q = db('estate_transactions')
    .where('estate_id', estateId)
    .first(
      db.raw("coalesce(sum(case when type = 'income' then amount else 0 end), 0) as income"),
      db.raw("coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as expenses"),
    )
  if (from) q.where('occurred_at', '>=', from)
  if (to) q.where('occurred_at', '<', to)
  const row = await q
  const income = Number(row?.income ?? 0)
  const expenses = Number(row?.expenses ?? 0)
  return { income, expenses, net: income - expenses }
}
